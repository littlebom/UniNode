import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { StudentLoginDto } from './dto/student-login.dto'
import { RefreshTokenDto } from './dto/refresh-token.dto'
import { RegisterDidDto } from './dto/register-did.dto'
import { Public } from './decorators/public.decorator'
import { CurrentUser, AuthenticatedUser } from './decorators/current-user.decorator'
import { JwtAuthGuard } from './jwt-auth.guard'

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: StudentLoginDto,
  ): Promise<{ success: true; data: { token: string; refreshToken: string; did: string | null } }> {
    const result = await this.authService.login(dto.studentId, dto.password)
    return {
      success: true,
      data: result,
    }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ success: true; data: { token: string } }> {
    const result = await this.authService.refresh(dto.refreshToken)
    return {
      success: true,
      data: result,
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('did/register')
  @HttpCode(HttpStatus.OK)
  async registerDID(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDidDto,
  ): Promise<{ success: true; data: { did: string; publicKey: string } }> {
    const result = await this.authService.registerDID(
      user.studentId!,
      dto.studentId,
      dto.did,
      dto.publicKey,
    )
    return {
      success: true,
      data: result,
    }
  }
}
