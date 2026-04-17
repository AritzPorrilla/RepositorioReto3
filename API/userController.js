const path = require('path');
const fs = require('fs/promises');
const crypto = require('crypto');
const User = require('./userModel');

const PROFILE_IMAGE_DIR = path.join(__dirname, '..', 'PlayAlmiWeb', 'img', 'perfiles');
const PROFILE_IMAGE_ROUTE = '/img/perfiles';

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isDataImage(value) {
    return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(String(value || ''));
}

function getImageExtension(mimeType) {
    const normalizado = String(mimeType || '').toLowerCase();

    if (normalizado === 'image/png') return 'png';
    if (normalizado === 'image/webp') return 'webp';
    if (normalizado === 'image/gif') return 'gif';
    return 'jpg';
}

async function persistProfileImage(photoValue, username) {
    const value = String(photoValue || '').trim();
    if (!value) {
        return '';
    }

    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    if (value.startsWith('/img/') || value.startsWith('img/')) {
        return value.startsWith('/') ? value : `/${value}`;
    }

    if (!isDataImage(value)) {
        return value;
    }

    const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
        return value;
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');
    const safeUsername = String(username || 'perfil')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'perfil';
    const fileName = `${safeUsername}-${crypto.randomUUID()}.${getImageExtension(mimeType)}`;

    await fs.mkdir(PROFILE_IMAGE_DIR, { recursive: true });
    await fs.writeFile(path.join(PROFILE_IMAGE_DIR, fileName), buffer);

    return `${PROFILE_IMAGE_ROUTE}/${fileName}`;
}

function normalizePhotoKey(username) {
    return String(username || 'perfil')
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'perfil';
}

async function resolvePhotoFromDisk(username) {
    const safeUsername = normalizePhotoKey(username);

    try {
        const files = await fs.readdir(PROFILE_IMAGE_DIR);
        const fileName = files.find((name) => name.startsWith(`${safeUsername}-`));

        if (!fileName) {
            return '';
        }

        return `${PROFILE_IMAGE_ROUTE}/${fileName}`;
    } catch {
        return '';
    }
}

exports.index = async function(req, res) {
    try {
        const users = await User.get();
        const usersWithPhotos = await Promise.all(users.map(async (user) => {
            if (user.foto_perfil) {
                return user;
            }

            const foto_perfil = await resolvePhotoFromDisk(user.username);
            if (!foto_perfil) {
                return user;
            }

            return {
                ...user.toObject(),
                foto_perfil
            };
        }));

        res.json({
            status: 'success',
            message: 'Users retrieved successfully',
            data: usersWithPhotos
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
            foto_perfil: await persistProfileImage(req.body.foto_perfil, username)
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
            user.foto_perfil = await persistProfileImage(req.body.foto_perfil, user.username);
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

