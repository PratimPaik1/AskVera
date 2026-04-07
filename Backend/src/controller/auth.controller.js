import userModel from "../models/User.Models.js";
import jwt from "jsonwebtoken";
import blackListModel from "../models/blacklisting.model.js";
import { sendEmail } from "../services/mail.servics.js";

export async function registerController(req, res) {
    try {
        const { userName, email, password } = req.body;
        console.log(userName,email,password)
        const lowerUserName = userName.toLowerCase()
        const lowerEmail = email.toLowerCase()


        if (!userName || !email || !password) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }

        const existingUser = await userModel.findOne({
            $or: [{ email: lowerEmail }, { userName: lowerUserName }],
        });

        if (existingUser) {
            return res.status(405).json({
                message: "User already exists",
                success: false,
                err: "User already exists"

            });
        }

        const newUser = await userModel.create({
            userName: lowerUserName,
            email: lowerEmail,
            password,
        });

        const token = jwt.sign({
            email: newUser.email,
        }, process.env.JWT_SECRET)



        await sendEmail({
            to: lowerEmail,
            subject: "Verify Your Account - Askvera",
            html: `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>🚀 Welcome to Askvera</h2>

        <p>Hello,</p>

        <p>Thank you for signing up! Please verify your email address to activate your account.</p>

        <p>
            <a href="${process.env.CLIENT_URL}/api/auth/verifyEmail?token=${token}" 
               style="display:inline-block;padding:10px 20px;background:#007bff;color:#fff;text-decoration:none;border-radius:5px;">
               Verify Your Account
            </a>
        </p>

        <p>If you did not create this account, please ignore this email.</p>

        <p>— Team Askvera 💙</p>

        <hr/>
        <p style="font-size:12px;color:gray;">© 2026 Askvera. All rights reserved.</p>
    </div>
    `
        })


        const userResponse = newUser.toObject();
        delete userResponse.password;

        res.status(201).json({

            message: "User created",
            success: true,
            user: userResponse,
        });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({
                message: "Duplicate email or username",
            });
        }

        console.error(err);

        res.status(500).json({
            message: "Server error",
        });
    }
}



export async function loginController(req, res) {
    try {
        const { identifier, password } = req.body;
        
        const isEmail = identifier.includes("@");
       
        const user = await userModel.findOne(
            isEmail
                ? { email: identifier.toLowerCase() }
                : { userName: identifier.toLowerCase() }
        ).select("+password");

        if (!user) {
            return res.status(400).json({
                message: "Invalid credentials",
                success: false,
                err: "Invalid credentials",
                
            });
        }

        const isPasswordMatch = await user.comparePassword(password);

        if (!isPasswordMatch) {
            return res.status(400).json({
                message: "Invalid credentials",
                success: false,
                err: "Invalid credentials"

            });
        }

        if (!user.verified) {
            return res.status(400).json({
                message: "Please verify your email before logging in",
                success: false,
                err: "Email not verified"
            })
        }

        const token = jwt.sign({
            id: user._id,
            email: user.email,
        }, process.env.JWT_SECRET, { expiresIn: '7d' })

        res.cookie("token", token)

        res.status(200).json({
            message: "Login successful",
            success: true,
            user: {
                id: user._id,
                username: user.userName,
                email: user.email
            }
        })
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Server error",
            success: false,
            err: "Server error"

        });
    }
}



export async function verifyEmail(req, res) {
    try {
        const { token } = req.query;
        if (!token) {
            return res.send(`
<!DOCTYPE html>
<html>
<head>
<style>
body {
    background:#0f172a;
    color:#fff;
    font-family:Arial;
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
    margin:0;
}
.container {
    text-align:center;
    background:#1e293b;
    padding:40px;
    border-radius:12px;
    box-shadow:0 0 20px rgba(0,0,0,0.5);
}
.btn {
    display:inline-block;
    margin-top:20px;
    padding:10px 20px;
    background:#3b82f6;
    color:#fff;
    text-decoration:none;
    border-radius:6px;
}
</style>
</head>
<body>
<div class="container">
    <h2>❌ Invalid Request</h2>
    <p>Verification token is missing.</p>
    <a href="${process.env.FRONTEND_URL}/register" class="btn">Go Back</a>
</div>
</body>
</html>
`);
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // decoded.email
        const user = await userModel.findOne({ email: decoded.email });

        if (!user) {
            return res.send(`
<!DOCTYPE html>
<html>
<head><style>body {
    background:#0f172a;
    color:#fff;
    font-family:Arial;
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
    margin:0;
}
.container {
    text-align:center;
    background:#1e293b;
    padding:40px;
    border-radius:12px;
    box-shadow:0 0 20px rgba(0,0,0,0.5);
}
.btn {
    display:inline-block;
    margin-top:20px;
    padding:10px 20px;
    background:#3b82f6;
    color:#fff;
    text-decoration:none;
    border-radius:6px;
}</style></head>
<body>
<div class="container">
    <h2>❌ User Not Found</h2>
    <p>This account does not exist.</p>
    <a href="${process.env.FRONTEND_URL}/register" class="btn">Register Again</a>
</div>
</body>
</html>
`);
        }
        if (user.verified) {
            return res.send(`
<!DOCTYPE html>
<html>
<head>
<head><style>body {
    background:#0f172a;
    color:#fff;
    font-family:Arial;
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
    margin:0;
}
.container {
    text-align:center;
    background:#1e293b;
    padding:40px;
    border-radius:12px;
    box-shadow:0 0 20px rgba(0,0,0,0.5);
}
.btn {
    display:inline-block;
    margin-top:20px;
    padding:10px 20px;
    background:#3b82f6;
    color:#fff;
    text-decoration:none;
    border-radius:6px;
}</style></head>
<body>
<div class="container">
    <h2>✅ Already Verified</h2>
    <p>Your email is already verified. You can login.</p>
    <a href="${process.env.FRONTEND_URL}/login" class="btn">Go to Login</a>
</div>
</body>
</html>
`);
        }

        user.verified = true;
        await user.save();

        const html = `
<!DOCTYPE html>
<html>
<head>
<style>
body {
    background:#0f172a;
    color:#fff;
    font-family:Arial;
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
    margin:0;
}
.container {
    text-align:center;
    background:#1e293b;
    padding:40px;
    border-radius:12px;
    box-shadow:0 0 20px rgba(0,0,0,0.5);
}
.btn {
    display:inline-block;
    margin-top:20px;
    padding:12px 25px;
    background:#22c55e;
    color:#fff;
    text-decoration:none;
    border-radius:6px;
}
</style>
</head>
<body>

<div class="container">
    <h2>🎉 Email Verified Successfully!</h2>
    <p>Your account is now active.</p>

    <a href="${process.env.FRONTEND_URL}/login" class="btn">
        Go to Login
    </a>
</div>

</body>
</html>
`;

        return res.send(html)

    } catch (err) {
        return res.send(`
<!DOCTYPE html>
<html>
<head>
<head><style>body {
    background:#0f172a;
    color:#fff;
    font-family:Arial;
    display:flex;
    justify-content:center;
    align-items:center;
    height:100vh;
    margin:0;
}
.container {
    text-align:center;
    background:#1e293b;
    padding:40px;
    border-radius:12px;
    box-shadow:0 0 20px rgba(0,0,0,0.5);
}
.btn {
    display:inline-block;
    margin-top:20px;
    padding:10px 20px;
    background:#3b82f6;
    color:#fff;
    text-decoration:none;
    border-radius:6px;
}</style></head>
<body>
<div class="container">
    <h2>⚠️ Link Expired</h2>
    <p>Your verification link is invalid or expired.</p>
    <a href="${process.env.CLIENT_URL}/resend-verification" class="btn">
        Resend Email
    </a>
</div>
</body>
</html>
`);
    }
}



export async function logout(req, res) {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(400).json({
                message: "Token not found"
            });
        }

        res.clearCookie("token");


        await blackListModel.create({ token });


        return res.status(200).json({
            message: "User logged out successfully"
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",

        });
    }
}

export async function getME(req,res) {
        const userId=req.user.id
        const user = await userModel.findOne({
        _id: userId
    })
    res.status(200).json({
        message: "User fetched",
         success: true,
        user: user
    })
}