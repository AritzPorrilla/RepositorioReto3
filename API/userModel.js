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
        }
    },
    { collection: 'users' }
);

var User = module.exports = mongoose.model('user', userSchema);

module.exports.get = async function(limit) {
    try {
        return await User.find().limit(limit);
    } catch (error) {
        throw error;
    }
};