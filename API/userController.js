const User = require('./userModel');

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

exports.index = async function(req, res) {
    try {
        const users = await User.get();
        res.json({
            status: 'success',
            message: 'Users retrieved successfully',
            data: users
        });
    } catch (err) {
        res.json({
            status: 'error',
            message: err.message
        });
    }
};

exports.new = async function(req, res) {
    try {
        const username = String(req.body.username || '').trim();
        if (!username) {
            return res.status(400).json({
                message: 'Username is required'
            });
        }

        const existingUser = await User.findOne({
            username: new RegExp(`^${escapeRegex(username)}$`, 'i')
        });

        if (existingUser) {
            return res.status(409).json({
                message: 'User already exists'
            });
        }

        const user = new User({
            username,
            password: req.body.password,
            fecha_lanzamiento: req.body.fecha_lanzamiento,
            kills: req.body.kills,
            puntos: req.body.puntos,
            foto_perfil: req.body.foto_perfil || ''
        });

        const savedUser = await user.save();

        res.json({
            message: 'User added',
            data: savedUser
        });
    } catch (err) {
        res.status(500).json({
            message: 'Error creating user',
            error: err.message
        });
    }
};


exports.view = async function(req, res) {
    try {
        const user = await User.findById(req.params.user_id);
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "User not found"
            });
        }

        res.json({
            message: "User details",
            data: user
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Error fetching user details",
            error: error.message
        });
    }
};

exports.update = async function(req, res) {
    try {
        const user = await User.findById(req.params.user_id);
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "User not found"
            });
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'username')) {
            user.username = req.body.username;
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'password') && req.body.password !== '') {
            user.password = req.body.password;
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'fecha_lanzamiento')) {
            user.fecha_lanzamiento = req.body.fecha_lanzamiento;
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'kills')) {
            user.kills = req.body.kills;
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'puntos')) {
            user.puntos = req.body.puntos;
        }

        if (Object.prototype.hasOwnProperty.call(req.body, 'foto_perfil')) {
            user.foto_perfil = req.body.foto_perfil || '';
        }

        const updatedUser = await user.save();

        res.json({
            message: "User updated",
            data: updatedUser
        });
    } catch (err) {
        res.status(500).json({
            message: "Error updating user",
            error: err.message
        });
    }
};


exports.delete = async function(req, res) {
    try {
        const user = await User.findByIdAndDelete(req.params.user_id);
        if (!user) {
            return res.status(404).json({
                status: "error",
                message: "User not found"
            });
        }
        res.json({
            status: "Success",
            message: "User deleted"
        });
    } catch (err) {
        res.status(500).json({
            message: "Error deleting user",
            error: err.message
        });
    }
};


exports.viewgenero = async function(req, res) {
    try {
        const users = await User.find({ kills: req.params.genero });
        if (!users || users.length === 0) {
            return res.status(404).json({
                status: "error",
                message: "No users found with that kills"
            });
        }

        res.json({
            message: "User details by kills",
            data: users
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Error fetching user details",
            error: error.message
        });
    }
};

