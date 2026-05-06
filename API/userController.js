const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const User = require('./userModel');

const PROFILE_IMAGE_DIR = '/var/www/html/fotoperfil';
const PROFILE_IMAGE_ROUTE = '/fotoperfil';
const CLOUDINARY_CLOUD_NAME = String(process.env.CLOUDINARY_CLOUD_NAME || 'dmxk5vgxe').trim();
const CLOUDINARY_UPLOAD_PRESET = String(process.env.CLOUDINARY_UPLOAD_PRESET || 'Zomumba').trim();
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${encodeURIComponent(CLOUDINARY_CLOUD_NAME)}/image/upload`;
 
function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
 
function isDataImage(value) {
    return /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(String(value || ''));
}

function getImageExtension(mimeType) {
    const normalized = String(mimeType || '').toLowerCase();

    if (normalized === 'image/jpeg' || normalized === 'image/jpg') return 'jpg';
    if (normalized === 'image/png') return 'png';
    if (normalized === 'image/webp') return 'webp';
    if (normalized === 'image/gif') return 'gif';
    if (normalized === 'image/avif') return 'avif';

    return 'png';
}

async function uploadDataImageToCloudinary(dataImage, username) {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        return '';
    }

    const publicIdBase = normalizePhotoKey(username || 'perfil');
    const formData = new FormData();
    formData.append('file', dataImage);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('public_id', `${publicIdBase}-${Date.now()}`);
    formData.append('folder', 'PlayAlmi/perfiles');

    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloudinary ${response.status}: ${errorText}`);
    }

    const payload = await response.json();
    return String(payload.secure_url || payload.url || '').trim();
}
 
// Normaliza el valor de foto antes de guardarlo en MongoDB.
// Las fotos base64 se almacenan directamente → accesibles desde cualquier equipo.
async function resolvePhotoValue(raw, username) {
    // El frontend puede enviar el prefijo legacy "playalmi-inline-image::", lo eliminamos
    const INLINE_PFX = 'playalmi-inline-image::';
    let value = String(raw || '').trim();
    if (value.startsWith(INLINE_PFX)) value = value.slice(INLINE_PFX.length);
 
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
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

    try {
        const cloudinaryUrl = await uploadDataImageToCloudinary(value, username);
        if (cloudinaryUrl) {
            return cloudinaryUrl;
        }
    } catch (cloudErr) {
        console.error('Error subiendo foto a Cloudinary, usando fallback local:', cloudErr.message);
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
        res.json({ status: 'success', message: 'Users retrieved successfully', data: users });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};
 
// POST /api/users
exports.new = async function (req, res) {
    try {
        const username = String(req.body.username || '').trim();
        if (!username) return res.status(400).json({ message: 'Username is required' });
 
        const exists = await User.findOne({ username: new RegExp(`^${escapeRegex(username)}$`, 'i') });
        if (exists) return res.status(409).json({ message: 'User already exists' });
 
        const user = new User({
            username,
            password:           req.body.password,
            fecha_lanzamiento:  req.body.fecha_lanzamiento,
            kills:              req.body.kills,
            puntos:             req.body.puntos,
            foto_perfil:        await resolvePhotoValue(req.body.foto_perfil, username),
        });
 
        const saved = await user.save();
        res.json({ message: 'User added', data: saved });
    } catch (err) {
        res.status(500).json({ message: 'Error creating user', error: err.message });
    }
};
 
// POST /api/login
exports.login = async function (req, res) {
    try {
        const username = String(req.body.username || '').trim();
        const password = String(req.body.password || '');
 
        if (!username || !password) {
            return res.status(400).json({ status: 'error', message: 'Username and password are required' });
        }
 
        const user = await User.findOne({ username: new RegExp(`^${escapeRegex(username)}$`, 'i') });
        if (!user || String(user.password || '') !== password) {
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }
 
        const userData = user.toObject();
        delete userData.password;
 
        res.json({ status: 'success', message: 'Login successful', data: userData });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Error logging in', error: err.message });
    }
};

exports.view = async function(req, res) {
    try {
        const user = await User.findById(req.params.user_id);
        if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });
        res.json({ message: 'User details', data: user });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Error fetching user', error: err.message });
    }
};
 
// PUT /api/users/:user_id
exports.update = async function (req, res) {
    try {
        const user = await User.findById(req.params.user_id);
        if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

        const body = req.body;
        if ('username'          in body) user.username          = body.username;
        if ('password'          in body && body.password !== '') user.password = body.password;
        if ('fecha_lanzamiento' in body) user.fecha_lanzamiento = body.fecha_lanzamiento;
        if ('kills'             in body) user.kills             = body.kills;
        if ('puntos'            in body) user.puntos            = body.puntos;
        if ('foto_perfil'       in body) user.foto_perfil       = await resolvePhotoValue(body.foto_perfil, user.username);

        const updated = await user.save();
        res.json({ message: 'User updated', data: updated });
    } catch (err) {
        res.status(500).json({ message: 'Error updating user', error: err.message });
    }
};


exports.delete = async function(req, res) {
    try {
        const user = await User.findById(req.params.user_id);
        if (!user) return res.status(404).json({ status: 'error', message: 'User not found' });

        await User.findByIdAndDelete(req.params.user_id);
        res.json({ status: 'Success', message: 'User deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting user', error: err.message });
    }
};

// GET /api/users/kills/:kills
exports.viewgenero = async function (req, res) {
    try {
        const users = await User.find({ kills: req.params.kills });
        if (!users.length) return res.status(404).json({ status: 'error', message: 'No users found with that kills value' });
        res.json({ message: 'User details by kills', data: users });
    } catch (err) {
        res.status(500).json({ status: 'error', message: 'Error fetching users', error: err.message });
    }
};
