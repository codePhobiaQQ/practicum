export interface UserSchema {
  username: string
  role?: string
  isApproval?: boolean
}

export interface AuthSchema {
  _inited: boolean
  authPopupOpen?: boolean
  authData?: UserSchema
}

export interface UserLoginProps {
  username: string
  password: string
}
