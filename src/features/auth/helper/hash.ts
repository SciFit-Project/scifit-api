import bcrypt from 'bcrypt'
const salt = Number(process.env.BCRYPT_SALT);
export const hashPassword = async (password: string) => {
    return await bcrypt.hash(password, salt)
}

export const comparePassword = async (passInput: string, hash: string): Promise<boolean> => {
    return await bcrypt.compareSync(passInput, hash)
}