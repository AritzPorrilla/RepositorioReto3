const mongoose = require('mongoose');
 
const userSchema = new mongoose.Schema(
    {
        username:          { type: String,  required: true },
        password:          { type: String,  required: true },
        fecha_lanzamiento: { type: Date,    default: Date.now },
        kills:             { type: String },
        puntos:            { type: Number,  required: true },
        foto_perfil:       { type: String,  default: '' },
    },
    { collection: 'users' }
);
 
const User = mongoose.models.users || mongoose.model('users', userSchema, 'users');
 
// Devuelve todos los usuarios (con límite opcional)
User.get = async function (limit) {
    const query = User.find();
    if (Number.isInteger(limit) && limit > 0) query.limit(limit);
    return query.exec();
};
 
module.exports = User;
