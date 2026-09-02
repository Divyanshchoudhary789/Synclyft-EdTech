const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel.js");
const { frontendUrls } = require("./env.js");

let io;
const userSocketMap = new Map();

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: frontendUrls.length ? frontendUrls : "http://localhost:3000",
            methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
            credentials: true
        }
    });

    const parseCookie = (raw, name) => {
        if (!raw) return null;
        for (const part of raw.split(/;\s*/)) {
            const eq = part.indexOf("=");
            if (eq > -1 && part.slice(0, eq).trim() === name) {
                return decodeURIComponent(part.slice(eq + 1));
            }
        }
        return null;
    };

    io.use(async (socket, next) => {
        try {
            const token =
                socket.handshake.auth?.token ||
                parseCookie(socket.handshake.headers.cookie, "token");

            if (!token) {
                return next(new Error("Authentication error: Token missing."));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select("_id role");

            if (!user) {
                return next(new Error("Authentication error: User not found."));
            }

            socket.user = user;
            next();
        } catch (err) {
            return next(new Error("Authentication failed."));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.user._id.toString();
        
        socket.join(userId);
        userSocketMap.set(userId, socket.id);

        socket.on("disconnect", () => {
            userSocketMap.delete(userId);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error("Socket.io engine state has not been initialized yet!");
    }
    return io;
};

module.exports = { initSocket, getIO };