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
    { collection: 'usuarios' }
);

var User = module.exports = mongoose.model('usuarios', userSchema);

module.exports.get = async function(limit) {
    try {
        const query = User.find();

        if (Number.isInteger(limit) && limit > 0) {
            query.limit(limit);
        }

        return await query;
    } catch (error) {
        throw error;
    }
};