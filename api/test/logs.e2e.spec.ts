import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/modules/app/app.module';

describe('Request Logs API (e2e)', () => {
  let app: INestApplication;
  const authHeader = { Authorization: 'Bearer changeme' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(process.env.API_PREFIX ?? 'scim');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns logs after a simple SCIM interaction', async () => {
    // Trigger a 404 (still logged) then a ServiceProviderConfig fetch
    await request(app.getHttpServer())
      .get('/scim/Users/non-existent')
      .set(authHeader)
      .expect(404);

    await request(app.getHttpServer())
      .get('/scim/ServiceProviderConfig')
      .set(authHeader)
      .expect(200);

    const logs = await request(app.getHttpServer())
      .get('/scim/admin/logs?take=10')
      .set(authHeader)
      .expect(200);

    expect(Array.isArray(logs.body.items)).toBe(true);
    expect(logs.body.items.length).toBeGreaterThanOrEqual(2);
    const hasConfig = logs.body.items.some((l: any) => l.url.includes('ServiceProviderConfig'));
    expect(hasConfig).toBe(true);
  });
});
