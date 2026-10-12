import { Database } from "../deps.ts";
import { assert, test } from "../test.ts";
import { MIGRATIONS, runMigrations } from "./migrations.ts";

test(function migrationsCreateExpectedTables() {
	const db = new Database(":memory:");
	const { applied } = runMigrations(db, MIGRATIONS);
	assert.assertEquals(applied, ["0001_init", "0002_nullable_document_data"]);

	const tables = db
		.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
		.all()
		.map((r) => (r as { name: string }).name);
	assert.assertEquals(tables, [
		"documents",
		"invites",
		"passkeys",
		"schema_migrations",
		"user_vaults",
		"users",
		"vaults",
	]);
	db.close();
});

test(function migrationsCreateExpectedIndexes() {
	const db = new Database(":memory:");
	runMigrations(db, MIGRATIONS);
	const indexes = db
		.prepare(
			"SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name",
		)
		.all()
		.map((r) => (r as { name: string }).name);
	assert.assertEquals(indexes, ["passkeys_user_idx", "user_vaults_vault_idx"]);
	db.close();
});

test(function runMigrationsIsIdempotent() {
	const db = new Database(":memory:");
	runMigrations(db, MIGRATIONS);
	const second = runMigrations(db, MIGRATIONS);
	assert.assertEquals(second.applied, []);
	db.close();
});

test(function runMigrationsAppliesOnlyNewOnes() {
	const db = new Database(":memory:");
	const first: typeof MIGRATIONS = [
		{ name: "0001_init", sql: "CREATE TABLE a (x INTEGER);" },
	];
	const second: typeof MIGRATIONS = [
		...first,
		{ name: "0002_add_b", sql: "CREATE TABLE b (y INTEGER);" },
	];
	assert.assertEquals(runMigrations(db, first).applied, ["0001_init"]);
	assert.assertEquals(runMigrations(db, second).applied, ["0002_add_b"]);

	const tables = db
		.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
		.all()
		.map((r) => (r as { name: string }).name);
	assert.assertEquals(tables, ["a", "b", "schema_migrations"]);
	db.close();
});

test(function runMigrationsRollsBackOnFailure() {
	const db = new Database(":memory:");
	runMigrations(db, [
		{ name: "0001_init", sql: "CREATE TABLE a (x INTEGER);" },
	]);
	assert.assertThrows(() =>
		runMigrations(db, [
			{ name: "0001_init", sql: "CREATE TABLE a (x INTEGER);" },
			{
				name: "0002_bad",
				sql: "CREATE TABLE b (y INTEGER); CREATE TABLE b (y INTEGER);",
			},
		]),
	);
	const tables = db
		.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
		.all()
		.map((r) => (r as { name: string }).name);
	assert.assertEquals(tables, ["a", "schema_migrations"]);
	const applied = db
		.prepare("SELECT name FROM schema_migrations ORDER BY name")
		.all()
		.map((r) => (r as { name: string }).name);
	assert.assertEquals(applied, ["0001_init"]);
	db.close();
});
