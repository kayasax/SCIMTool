import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/modules/app/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';

// Basic contract tests for Users endpoint covering list (empty) and create/get lifecycle.
describe('SCIM Users API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const authHeader = { Authorization: 'Bearer changeme' }; // uses default .env secret

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix(process.env.API_PREFIX ?? 'scim');
    await app.init();
  prisma = app.get(PrismaService);
  // Clean tables (cast to any to bypass strict property lookups in generated client typing during tests)
  const p: any = prisma;
  await p.groupMember?.deleteMany?.();
  await p.scimGroup?.deleteMany?.();
  await p.scimUser?.deleteMany?.();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /scim/Users returns empty list initially', async () => {
    const res = await request(app.getHttpServer())
      .get('/scim/Users')
      .set(authHeader)
      .expect(200);

    expect(res.body).toMatchObject({
      schemas: expect.arrayContaining(['urn:ietf:params:scim:api:messages:2.0:ListResponse']),
      totalResults: 0,
      Resources: []
    });
  });

  it('POST /scim/Users creates a user and GET returns it', async () => {
    const createPayload = {
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
      userName: 'alice@example.com',
      externalId: 'ext-alice-1',
      name: { givenName: 'Alice', familyName: 'Anderson' }
    };

    const createRes = await request(app.getHttpServer())
      .post('/scim/Users')
      .set(authHeader)
      .send(createPayload)
      .expect(201);

    expect(createRes.body).toMatchObject({
      id: expect.any(String),
      userName: 'alice@example.com',
      externalId: 'ext-alice-1',
      active: true,
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:User']
    });

    const userId = createRes.body.id;

    const getRes = await request(app.getHttpServer())
      .get(`/scim/Users/${userId}`)
      .set(authHeader)
      .expect(200);

    expect(getRes.body).toMatchObject({ id: userId, userName: 'alice@example.com' });
  });
});
