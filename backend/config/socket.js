const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel.js");

let io;
const userSocketMap = new Map();

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
            credentials: true
        }
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.cookie?.split("token=")[1]?.split(";")[0];
            
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