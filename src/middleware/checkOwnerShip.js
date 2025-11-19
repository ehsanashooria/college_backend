const checkOwnership = (Model, resourceIdParam = 'id') => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params[resourceIdParam];
            const resource = await Model.findById(resourceId);

            if (!resource) {
                return res.status(404).json({
                    success: false,
                    message: 'Resource not found'
                });
            }

            // Admins can access everything
            if (req.user.role === 'admin') {
                return next();
            }

            // Check ownership based on model structure
            const ownerField = resource.student || resource.user || resource.instructor;

            if (ownerField && ownerField.toString() === req.user.id) {
                next();
            } else {
                return res.status(403).json({
                    success: false,
                    message: 'You are not authorized to access this resource'
                });
            }
        } catch (error) {
            next(error);
        }
    };
};

module.exports = checkOwnership;