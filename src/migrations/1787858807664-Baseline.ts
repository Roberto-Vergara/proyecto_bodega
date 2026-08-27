import type { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Migracion base: el esquema completo tal como quedo al pasar de postgres a
 * SQL Server 2012.
 *
 * La base de produccion YA tiene estas tablas (se crearon con synchronize
 * antes de adoptar migraciones), asi que alla esta marcada como aplicada a
 * mano en la tabla "migraciones" y no se vuelve a ejecutar. Sirve para poder
 * levantar el esquema desde cero en una base nueva.
 *
 * De aca en adelante, cada cambio de entidad va en su propia migracion:
 *   pnpm migration:generate src/migrations/LoQueCambio
 *   pnpm migration:run
 */

export class Baseline1787858807664 implements MigrationInterface {
    name = 'Baseline1787858807664'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "dbo"."usuarios" ("id" varchar(36) NOT NULL, "nombre" nvarchar(100) NOT NULL, "apellido" nvarchar(100) NOT NULL, "email" varchar(150) NOT NULL, "passHash" varchar(256) NOT NULL, "primera_password" bit NOT NULL CONSTRAINT "DF_7395e19f8260dea8f070dbb7008" DEFAULT 1, "role" nvarchar(255) CONSTRAINT CHK_5a1bf14ee6efa2e65601de9534_ENUM CHECK(role IN ('admin','employee')) NOT NULL CONSTRAINT "DF_d51544a114849146681c32124d6" DEFAULT 'employee', "area" nvarchar(255) CONSTRAINT CHK_293558e622f60fe1263063f595_ENUM CHECK(area IN ('despacho','logistica','general')) NOT NULL CONSTRAINT "DF_a242cf3bf108d01ea5e8939f973" DEFAULT 'general', "isActive" bit NOT NULL CONSTRAINT "DF_9258b03288dafa2983176e4d4db" DEFAULT 1, "creado_en" datetime2 NOT NULL CONSTRAINT "DF_d194fa0ef8fc454b14edff6e324" DEFAULT getdate(), "actualizado_en" datetime2 NOT NULL CONSTRAINT "DF_a7ae8b31dd12e22b80c28b30f2e" DEFAULT getdate(), CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_446adfc18b35418aac32ae0b7b" ON "dbo"."usuarios" ("email") `);
        await queryRunner.query(`CREATE TABLE "dbo"."ventas_log" ("id" varchar(36) NOT NULL, "cod_venta" int NOT NULL, "nom_cliente" nvarchar(30) NOT NULL, "rut_cliente" varchar(8), "id_vendedor" varchar(5), "fecha_orden" date, "instrucciones" nvarchar(40), "monto_total" decimal(11,2), "ultima_consulta" datetime2 NOT NULL CONSTRAINT "DF_d371cbd4c172dba91a7f8f4e884" DEFAULT getdate(), CONSTRAINT "PK_1fbaf08129574d2ac1b570fb048" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c7c1ffbff6cf2969b4b84d324f" ON "dbo"."ventas_log" ("cod_venta") `);
        await queryRunner.query(`CREATE TABLE "dbo"."carro_items" ("id" varchar(36) NOT NULL, "carro_id" varchar(36) NOT NULL, "cod_venta" int NOT NULL, "nro_item" int NOT NULL, "cantidad_asignada" int NOT NULL, "cod_item" varchar(15) NOT NULL, "dim1" int NOT NULL, "dim2" int NOT NULL, "dim3" int NOT NULL, "marca_pieza" nvarchar(24), "cantidad_total_item" int NOT NULL, "fecha_asignacion" datetime2 NOT NULL CONSTRAINT "DF_7f2a629d1d76cb68fab495e2522" DEFAULT getdate(), "despachado_en" datetime2, "asignado_por" varchar(36), CONSTRAINT "chk_cantidad_asignada_positiva" CHECK ([cantidad_asignada] > 0), CONSTRAINT "PK_e7affcf09ec6aaf184203d651e6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_carro_items_venta_item" ON "dbo"."carro_items" ("cod_venta", "nro_item") `);
        await queryRunner.query(`CREATE INDEX "idx_carro_items_carro" ON "dbo"."carro_items" ("carro_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "uq_carro_item_activo" ON "dbo"."carro_items" ("carro_id", "cod_venta", "nro_item") WHERE [despachado_en] IS NULL`);
        await queryRunner.query(`CREATE TABLE "dbo"."carros" ("id" varchar(36) NOT NULL, "nro_carro" int NOT NULL, "estado_carro" nvarchar(255) CONSTRAINT CHK_d5ad4dbe43634d7d045c920c47_ENUM CHECK(estado_carro IN ('disponible','lleno','fuera_servicio')) NOT NULL CONSTRAINT "DF_2dee3accc763a85ab94073ad700" DEFAULT 'disponible', "ocupacion" nvarchar(255) CONSTRAINT CHK_d9410b35036f094d75950213bd_ENUM CHECK(ocupacion IN ('vacio','en_uso')) NOT NULL CONSTRAINT "DF_09bc9c9870c8b7b6521fabecef0" DEFAULT 'vacio', "ubicacion_carro" nvarchar(255) CONSTRAINT CHK_2dbe8dc49806ea188018f5e133_ENUM CHECK(ubicacion_carro IN ('corte','produccion','productos_terminados')) NOT NULL, "creado_en" datetime2 NOT NULL CONSTRAINT "DF_920f5f8ced913b329749054390b" DEFAULT getdate(), "actualizado_en" datetime2 NOT NULL CONSTRAINT "DF_9e27b7575c59bddf10e61468e0d" DEFAULT getdate(), CONSTRAINT "UQ_84408db9d12255d29b42c25ecf7" UNIQUE ("nro_carro"), CONSTRAINT "PK_ba7be410cab15cfd6475fda1b9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "dbo"."refresh_tokens" ("id" varchar(36) NOT NULL, "tokenHash" varchar(64) NOT NULL, "userId" varchar(36) NOT NULL, "expiresAt" datetime2 NOT NULL, "revoked" bit NOT NULL CONSTRAINT "DF_36c7f5a6a8d1c7c23470457dc3b" DEFAULT 0, "revokedAt" datetime2, "deviceInfo" nvarchar(255), "createdAt" datetime2 NOT NULL CONSTRAINT "DF_98c0562c3afc78514a32f560459" DEFAULT getdate(), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_c25bc63d248ca90e8dcc1d92d0" ON "dbo"."refresh_tokens" ("tokenHash") `);
        await queryRunner.query(`CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON "dbo"."refresh_tokens" ("userId") `);
        await queryRunner.query(`CREATE TABLE "dbo"."movimientos_carro" ("id" varchar(36) NOT NULL, "lote_id" varchar(36) NOT NULL, "tipo" nvarchar(255) CONSTRAINT CHK_b0af3eb0f22c6b93db4579f152_ENUM CHECK(tipo IN ('carro_creado','carga','movimiento','descarga','vaciado','despacho','cambio_estado','cambio_ubicacion')) NOT NULL, "carro_id" varchar(36), "nro_carro" int, "carro_destino_id" varchar(36), "nro_carro_destino" int, "cod_venta" int, "nro_item" int, "cod_item" varchar(15), "cantidad" int, "detalle" nvarchar(MAX), "usuario_id" varchar(36), "creado_en" datetime2 NOT NULL CONSTRAINT "DF_f17d7072dfc182e81e05e9fb7a1" DEFAULT getdate(), CONSTRAINT "PK_7c31ae3d81d61b18a70cdc1c214" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_mov_lote" ON "dbo"."movimientos_carro" ("lote_id") `);
        await queryRunner.query(`CREATE INDEX "idx_mov_fecha" ON "dbo"."movimientos_carro" ("creado_en") `);
        await queryRunner.query(`CREATE INDEX "idx_mov_venta_fecha" ON "dbo"."movimientos_carro" ("cod_venta", "creado_en") `);
        await queryRunner.query(`CREATE INDEX "idx_mov_destino_fecha" ON "dbo"."movimientos_carro" ("carro_destino_id", "creado_en") `);
        await queryRunner.query(`CREATE INDEX "idx_mov_carro_fecha" ON "dbo"."movimientos_carro" ("carro_id", "creado_en") `);
        await queryRunner.query(`ALTER TABLE "dbo"."carro_items" ADD CONSTRAINT "FK_8fbf2599861d07237f9850fe302" FOREIGN KEY ("carro_id") REFERENCES "dbo"."carros"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."carro_items" ADD CONSTRAINT "FK_b8d91b3dcddb3ba86cb15e82daa" FOREIGN KEY ("cod_venta") REFERENCES "dbo"."ventas_log"("cod_venta") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."carro_items" ADD CONSTRAINT "FK_3c771e9c35814e7bdf80d8c0eb6" FOREIGN KEY ("asignado_por") REFERENCES "dbo"."usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "dbo"."usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."movimientos_carro" ADD CONSTRAINT "FK_fac7c9447c534da559055f6712c" FOREIGN KEY ("carro_id") REFERENCES "dbo"."carros"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."movimientos_carro" ADD CONSTRAINT "FK_bceb2d8dff1f18fc712a0d8e6a7" FOREIGN KEY ("carro_destino_id") REFERENCES "dbo"."carros"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "dbo"."movimientos_carro" ADD CONSTRAINT "FK_e4bf98af586993614b869eddfb6" FOREIGN KEY ("usuario_id") REFERENCES "dbo"."usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "dbo"."movimientos_carro" DROP CONSTRAINT "FK_e4bf98af586993614b869eddfb6"`);
        await queryRunner.query(`ALTER TABLE "dbo"."movimientos_carro" DROP CONSTRAINT "FK_bceb2d8dff1f18fc712a0d8e6a7"`);
        await queryRunner.query(`ALTER TABLE "dbo"."movimientos_carro" DROP CONSTRAINT "FK_fac7c9447c534da559055f6712c"`);
        await queryRunner.query(`ALTER TABLE "dbo"."refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`);
        await queryRunner.query(`ALTER TABLE "dbo"."carro_items" DROP CONSTRAINT "FK_3c771e9c35814e7bdf80d8c0eb6"`);
        await queryRunner.query(`ALTER TABLE "dbo"."carro_items" DROP CONSTRAINT "FK_b8d91b3dcddb3ba86cb15e82daa"`);
        await queryRunner.query(`ALTER TABLE "dbo"."carro_items" DROP CONSTRAINT "FK_8fbf2599861d07237f9850fe302"`);
        await queryRunner.query(`DROP INDEX "idx_mov_carro_fecha" ON "dbo"."movimientos_carro"`);
        await queryRunner.query(`DROP INDEX "idx_mov_destino_fecha" ON "dbo"."movimientos_carro"`);
        await queryRunner.query(`DROP INDEX "idx_mov_venta_fecha" ON "dbo"."movimientos_carro"`);
        await queryRunner.query(`DROP INDEX "idx_mov_fecha" ON "dbo"."movimientos_carro"`);
        await queryRunner.query(`DROP INDEX "idx_mov_lote" ON "dbo"."movimientos_carro"`);
        await queryRunner.query(`DROP TABLE "dbo"."movimientos_carro"`);
        await queryRunner.query(`DROP INDEX "IDX_610102b60fea1455310ccd299d" ON "dbo"."refresh_tokens"`);
        await queryRunner.query(`DROP INDEX "IDX_c25bc63d248ca90e8dcc1d92d0" ON "dbo"."refresh_tokens"`);
        await queryRunner.query(`DROP TABLE "dbo"."refresh_tokens"`);
        await queryRunner.query(`DROP TABLE "dbo"."carros"`);
        await queryRunner.query(`DROP INDEX "uq_carro_item_activo" ON "dbo"."carro_items"`);
        await queryRunner.query(`DROP INDEX "idx_carro_items_carro" ON "dbo"."carro_items"`);
        await queryRunner.query(`DROP INDEX "idx_carro_items_venta_item" ON "dbo"."carro_items"`);
        await queryRunner.query(`DROP TABLE "dbo"."carro_items"`);
        await queryRunner.query(`DROP INDEX "IDX_c7c1ffbff6cf2969b4b84d324f" ON "dbo"."ventas_log"`);
        await queryRunner.query(`DROP TABLE "dbo"."ventas_log"`);
        await queryRunner.query(`DROP INDEX "IDX_446adfc18b35418aac32ae0b7b" ON "dbo"."usuarios"`);
        await queryRunner.query(`DROP TABLE "dbo"."usuarios"`);
    }

}
