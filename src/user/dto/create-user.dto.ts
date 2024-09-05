export class CreateUserDto {
    readonly name: string;
    readonly phoneOrEmail: string;
    readonly password: string;
}