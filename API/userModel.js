var mongoose = require('mongoose');

var userSchema = mongoose.Schema(
    {
        username: {
            type: String,
            required: true
        },
        password: {
            type: String,
            required: true
        },
        fecha_lanzamiento:{
            type:Date,
            default: Date.now
        },
        kills: {
            type: String
        },
        puntos: {
            type: Number,
            required: true
        },
        foto_perfil: {
            type: String,
            default: ''
        }
    },
    { collection: 'users' }
);

var User = module.exports = mongoose.models.user || mongoose.model('users', userSchema, 'users');

function withLimit(query, limit) {
    if (Number.isInteger(limit) && limit > 0) {
        query.limit(limit);
    }

    return query;
}

module.exports.get = async function(limit) {
    try {
        const currentDb = String(mongoose.connection?.name || '').trim();
        const dbCandidates = [currentDb, 'PlayAlmi', 'playAlmi'].filter((value, index, arr) => value && arr.indexOf(value) === index);
        const collectionCandidates = ['users'];

        for (const dbName of dbCandidates) {
            const dbConn = mongoose.connection.useDb(dbName, { useCache: true });

            for (const collectionName of collectionCandidates) {
                const modelName = `user_${dbName}_${collectionName}`;
                const CandidateUser = dbConn.models[modelName] || dbConn.model(modelName, userSchema, collectionName);
                const users = await withLimit(CandidateUser.find(), limit);

                if (Array.isArray(users) && users.length > 0) {
                    return users;
                }
            }
        }

        return [];
    } catch (error) {
        throw error;
    }
};