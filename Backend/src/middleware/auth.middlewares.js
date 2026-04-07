import jwt from "jsonwebtoken"
import blackListModel from "../models/blacklisting.model.js"

export async function identifyUser(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            message: "Unauthorized",
            success: false,
            err: "No token provided"
        })
    }
    const blacklistToken = await blackListModel.findOne({ token })
    if (blacklistToken) {
        return res.status(401).json({
            message: "user not authorized"
        })
    }
    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;

        next();

    } catch (err) {
        return res.status(401).json({
            message: "Unauthorized",
            success: false,
            err: "Invalid token"
        })
    }
}