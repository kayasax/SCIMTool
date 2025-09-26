import { Controller, Get, Res, Param } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { Public } from '../auth/public.decorator';

@Controller()
export class WebController {
  @Public()
  @Get('/')
  @Get('/admin')
  @Get('/admin/*')
  serveWebApp(@Res() res: Response): void {
    res.sendFile(join(__dirname, '..', '..', '..', 'public', 'index.html'));
  }

  @Public()
  @Get('/assets/*')
  serveAssets(@Param('0') fileName: string, @Res() res: Response): void {
    const filePath = join(__dirname, '..', '..', '..', 'public', 'assets', fileName);
    res.sendFile(filePath);
  }
}