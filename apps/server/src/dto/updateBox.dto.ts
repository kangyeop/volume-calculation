import { PartialType } from '@nestjs/mapped-types';
import { CreateBoxDto } from './createBox.dto';

export class UpdateBoxDto extends PartialType(CreateBoxDto) {}
