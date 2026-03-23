import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QueryBuildingsDto, SearchBuildingsDto } from './dto/query-buildings.dto';
import { CreateBuildingDto } from './dto/create-building.dto';

@Injectable()
export class BuildingsService {
  constructor(private prisma: PrismaService) {}

  async findInBounds(dto: QueryBuildingsDto) {
    return this.prisma.$queryRaw`
      SELECT
        b.id,
        b.address,
        b.building_name,
        b.build_year,
        b.residence_type,
        ST_Y(b.location::geometry) AS lat,
        ST_X(b.location::geometry) AS lng
      FROM buildings b
      WHERE ST_Within(
        b.location::geometry,
        ST_MakeEnvelope(${dto.swLng}, ${dto.swLat}, ${dto.neLng}, ${dto.neLat}, 4326)
      )
      LIMIT 500
    `;
  }

  async findById(id: string) {
    const rows = await this.prisma.$queryRaw`
      SELECT
        b.id,
        b.address,
        b.building_name,
        b.build_year,
        b.residence_type,
        ST_Y(b.location::geometry) AS lat,
        ST_X(b.location::geometry) AS lng
      FROM buildings b
      WHERE b.id = ${id}::uuid
    `;
    return (rows as any[])[0] ?? null;
  }

  async search(dto: SearchBuildingsDto) {
    return this.prisma.$queryRaw`
      SELECT
        b.id,
        b.address,
        b.building_name,
        b.residence_type,
        ST_Y(b.location::geometry) AS lat,
        ST_X(b.location::geometry) AS lng
      FROM buildings b
      WHERE b.address ILIKE ${'%' + dto.q + '%'}
      LIMIT ${dto.limit}
    `;
  }

  async create(dto: CreateBuildingDto) {
    const [building] = await this.prisma.$queryRaw<any[]>`
      INSERT INTO buildings (id, location, address, building_name, build_year, residence_type, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        ST_SetSRID(ST_MakePoint(${dto.lng}, ${dto.lat}), 4326)::geography,
        ${dto.address},
        ${dto.buildingName ?? null},
        ${dto.buildYear},
        ${dto.residenceType},
        NOW(), NOW()
      )
      RETURNING *, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
    `;
    return building;
  }

  async delete(id: string) {
    const building = await this.findById(id);
    if (!building) throw new NotFoundException('건물을 찾을 수 없습니다.');

    await this.prisma.building.delete({ where: { id } });
    return { deleted: true };
  }

  async getClusters(dto: QueryBuildingsDto) {
    const zoom = dto.zoom ?? 12;
    const precision = zoom <= 10 ? 3 : zoom <= 13 ? 4 : zoom <= 15 ? 5 : 6;
    return this.prisma.$queryRaw`
      SELECT
        ST_GeoHash(ST_Centroid(ST_Collect(location::geometry)), ${precision}) AS geohash,
        COUNT(*) AS count,
        AVG(ST_Y(location::geometry)) AS center_lat,
        AVG(ST_X(location::geometry)) AS center_lng
      FROM buildings
      WHERE ST_Within(
        location::geometry,
        ST_MakeEnvelope(${dto.swLng}, ${dto.swLat}, ${dto.neLng}, ${dto.neLat}, 4326)
      )
      GROUP BY ST_GeoHash(ST_Centroid(location::geometry), ${precision})
    `;
  }
}
