import bcrypt from "bcryptjs";

const isPasswordMatch = async (password, userPassword) => {
    const result = await bcrypt.compare(password, userPassword);
    return result;
};
export default isPasswordMatch;