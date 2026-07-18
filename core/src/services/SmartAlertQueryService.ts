import SmartAlert from '../models/SmartAlert';
import SavedSearch from '../models/SavedSearch';

/**
 * Smart Alert Query Service
 * Handles read-only operations for Smart Alerts
 */
export const getAllSmartAlerts = async (skip: number, limit: number) => {
    const [alerts, total] = await Promise.all([
        SmartAlert.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
        SmartAlert.countDocuments({}),
    ]);
    return { alerts, total };
};

export const getSmartAlertsForUser = async (userId?: string) => {
    const query = userId ? { userId } : {};
    
    // COMPATIBILITY LAYER: Read from BOTH SmartAlert and SavedSearch
    const [alerts, savedSearches] = await Promise.all([
        SmartAlert.find(query).sort({ createdAt: -1 }).lean(),
        SavedSearch.find(query).sort({ createdAt: -1 }).lean()
    ]);

    // Map SavedSearch to SmartAlert shape
    const mappedSearches = savedSearches.map((search) => ({
        _id: search._id,
        userId: search.userId,
        name: search.query || 'Saved Search',
        criteria: {
            keywords: search.query,
            categoryId: search.categoryId,
            locationId: search.locationId,
            minPrice: search.priceMin,
            maxPrice: search.priceMax
        },
        coordinates: search.coordinates,
        radiusKm: search.radiusKm || 50,
        isActive: true,
        notificationChannels: ['email'],
        createdAt: search.createdAt,
        updatedAt: search.updatedAt,
        __isLegacy: true // internal flag just in case
    }));

    // Combine and sort by createdAt descending
    const combined = [...alerts, ...mappedSearches].sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
    });

    return combined;
};
