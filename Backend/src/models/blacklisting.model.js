import mongoose from "mongoose"
const blackListSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "token is required"]
    }
}, {
    timestamps: true
})

const blackListModel = mongoose.model("blacklistModel", blackListSchema)

export default blackListModel