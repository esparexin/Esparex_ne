import { Request, Response } from 'express';
import logger from '@esparex/core/utils/logger';
import { respond } from "../../utils/respond";
import { sendErrorResponse } from "../../utils/errorResponse";
import { ApiResponse } from "@esparex/contracts";
import { SavedSearchCreatePayload } from "@esparex/contracts";

import { createSmartAlertMutation, deleteSmartAlertMutation } from '@esparex/core/services/smartAlert/SmartAlertMutationService';
import { getSmartAlertsForUser } from '@esparex/core/services/SmartAlertQueryService';
import { toAlertContract, getErrorMessage } from './shared';

const getUserId = (req: Request): string | null => {
    const user = req.user;
    if (!user) return null;
    return (user.id || user._id)?.toString() || null;
};

// COMPATIBILITY LAYER: Mapped to getSmartAlertsForUser
export const listSavedSearches = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            sendErrorResponse(req, res, 401, 'Unauthorized');
            return;
        }

        // Return SmartAlerts but let frontend parse it if it needs to
        // Wait, if frontend still thinks it is a SavedSearch, we should map it to SavedSearch shape
        const alerts = await getSmartAlertsForUser(userId);
        
        // Map SmartAlerts to legacy SavedSearch shape
        const legacyShape = alerts.map((alert) => ({
            id: alert._id.toString(),
            userId: alert.userId.toString(),
            query: alert.criteria?.keywords || alert.name || '',
            categoryId: alert.criteria?.categoryId?.toString(),
            locationId: alert.criteria?.locationId?.toString(),
            priceMin: alert.criteria?.minPrice,
            priceMax: alert.criteria?.maxPrice,
            createdAt: alert.createdAt,
            // also append SmartAlert fields just in case
            ...toAlertContract(alert)
        }));

        res.json(respond<ApiResponse<unknown>>({
            success: true,
            data: legacyShape
        }));
    } catch (error) {
        logger.error('Failed to fetch saved searches (via compat layer)', error);
        sendErrorResponse(req, res, 500, 'Failed to fetch saved searches');
    }
};

// COMPATIBILITY LAYER: Mapped to createSmartAlertMutation
export const createSavedSearchEntry = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            sendErrorResponse(req, res, 401, 'Unauthorized');
            return;
        }

        const payload = req.body as SavedSearchCreatePayload;
        
        // Map SavedSearchCreatePayload to SmartAlertCreatePayload
        const smartAlertPayload = {
            name: payload.query || 'Saved Search',
            criteria: {
                keywords: payload.query,
                categoryId: payload.categoryId,
                locationId: payload.locationId,
                minPrice: payload.priceMin,
                maxPrice: payload.priceMax
            },
            radiusKm: payload.radiusKm || 50,
            notificationChannels: ['email', 'in-app']
        };

        const created = await createSmartAlertMutation({
            user: req.user,
            body: smartAlertPayload
        });

        // Return mapped to legacy shape
        const legacyShape = {
            id: created._id.toString(),
            userId: created.userId.toString(),
            query: created.criteria?.keywords || created.name || '',
            categoryId: created.criteria?.categoryId?.toString(),
            locationId: created.criteria?.locationId?.toString(),
            priceMin: created.criteria?.minPrice,
            priceMax: created.criteria?.maxPrice,
            createdAt: created.createdAt,
            ...toAlertContract(created)
        };

        res.status(201).json(respond<ApiResponse<unknown>>({
            success: true,
            data: legacyShape
        }));
    } catch (error) {
        logger.error('Failed to create saved search (via compat layer)', error);
        sendErrorResponse(req, res, 400, getErrorMessage(error) || 'Failed to create saved search');
    }
};

// COMPATIBILITY LAYER: Mapped to deleteSmartAlertMutation
export const deleteSavedSearchEntry = async (req: Request, res: Response) => {
    try {
        const userId = getUserId(req);
        if (!userId) {
            sendErrorResponse(req, res, 401, 'Unauthorized');
            return;
        }

        const id = typeof req.params.id === 'string' ? req.params.id : '';
        
        await deleteSmartAlertMutation({
            alertId: id,
            user: req.user,
            admin: req.admin as { id?: string; _id?: string } | undefined
        });

        res.json(respond<ApiResponse<unknown>>({
            success: true,
            message: 'Saved search deleted',
            data: { id }
        }));
    } catch (error) {
        logger.error('Failed to delete saved search (via compat layer)', error);
        sendErrorResponse(req, res, 500, getErrorMessage(error) || 'Failed to delete saved search');
    }
};
