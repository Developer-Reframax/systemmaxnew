export interface DecodedToken {
  userId: string;
  email: string;
  role: string;
  matricula: string;
  iat: number;
  exp: number;
}