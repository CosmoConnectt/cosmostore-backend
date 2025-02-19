import mongoose from "mongoose";
//, { Types } removed (it was automatically added. Will see if i have to add it later)
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "name is required"]
    },
    email:
    {
        type: String,
        required: [true, "email is required"],
        unique: true,
        lowercase: true,
        trim: true
    },
    password:
    {
        type: String,
        required: [true, "password is required"],
        minlength: [6, "Password must be atleast 6 characters long"],

    },
    address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true },
      },
    cartItems:[
        {
            quantity: {
                type: Number,
                default: 1
            },
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product"
            }
        }
    ],
    role: {
        type: String,
        enum: ["customer","admin"],
        default: "customer"

    }
    //createdAt, updatedAt
},
{
    timestamps: true
})




//Pre save hook to hash the  password before saving to database
userSchema.pre("save", async function (next){
    if(!this.isModified("password")) return next();

    try {
        const  salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next()
    } catch (error) {
        next(error)
    }
}
)

userSchema.methods.comparePassword = async function (password) {
    return bcrypt.compare(password , this.password);
    
}

const User = mongoose.model("User", userSchema)
export default User