import assert from 'node:assert/strict';
import { BadRequestException } from '@nestjs/common';
import { SettlementWalletPostingService } from '../src/services/settlement-wallet-posting.service';

type Environment = 'SANDBOX' | 'PRODUCTION';

type WalletFixture = {
  id: number;
  orgId: number;
  environment: Environment;
  balance: number;
  heldBalance: number;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type LedgerFixture = {
  id: number;
  walletId: number;
  type: 'CREDIT' | 'DEBIT';
  sourceType: string;
  referenceId: string | null;
  amount: number;
  balanceAfter: number;
  status: 'HELD' | 'AVAILABLE' | 'RELEASED' | 'REVERSED';
  environment: Environment;
  createdAt: Date;
  deletedAt: Date | null;
};

type SettlementFixture = {
  id: string;
  purchaseOrderId: string;
  paymentTransactionId: string;
  supplierOrgId: number;
  grossAmount: number;
  platformFee: number;
  supplierNet: number;
  feeRuleId: string;
  feeSnapshot: Record<string, never>;
  environment: Environment;
  status: 'SETTLED';
  createdAt: Date;
  settledAt: Date;
  walletPostedAt: Date | null;
  walletLedgerEntryId: number | null;
};

type FixtureState = {
  settlement: SettlementFixture;
  wallets: WalletFixture[];
  ledger: LedgerFixture[];
};

const POSTED_AT = new Date('2026-08-31T09:53:35.536Z');

function postedFixture(): FixtureState {
  return {
    settlement: {
      id: 'bf77f6d1-f8c8-45f2-8679-bad0c171eee1',
      purchaseOrderId: 'po-fixture',
      paymentTransactionId: '2c80d13b-1f8e-4233-b91c-b56dc3ff4190',
      supplierOrgId: 1,
      grossAmount: 98_000,
      platformFee: 25,
      supplierNet: 97_975,
      feeRuleId: 'fee-fixture',
      feeSnapshot: {},
      environment: 'SANDBOX',
      status: 'SETTLED',
      createdAt: POSTED_AT,
      settledAt: POSTED_AT,
      walletPostedAt: POSTED_AT,
      walletLedgerEntryId: 6,
    },
    wallets: [{
      id: 5,
      orgId: 1,
      environment: 'SANDBOX',
      balance: 96_575,
      heldBalance: 123_138.6,
      currency: 'PHP',
      createdAt: POSTED_AT,
      updatedAt: POSTED_AT,
      deletedAt: null,
    }],
    ledger: [
      {
        id: 4,
        walletId: 5,
        type: 'CREDIT',
        sourceType: 'ESCROW_HOLD',
        referenceId: '2c80d13b-1f8e-4233-b91c-b56dc3ff4190',
        amount: 97_975,
        balanceAfter: 0,
        status: 'RELEASED',
        environment: 'SANDBOX',
        createdAt: POSTED_AT,
        deletedAt: null,
      },
      {
        id: 6,
        walletId: 5,
        type: 'CREDIT',
        sourceType: 'PURCHASE_ORDER_SETTLEMENT',
        referenceId: 'bf77f6d1-f8c8-45f2-8679-bad0c171eee1',
        amount: 97_975,
        balanceAfter: 97_975,
        status: 'AVAILABLE',
        environment: 'SANDBOX',
        createdAt: POSTED_AT,
        deletedAt: null,
      },
    ],
  };
}

function firstPostingFixture(): FixtureState {
  const state = postedFixture();
  state.settlement.walletPostedAt = null;
  state.settlement.walletLedgerEntryId = null;
  state.wallets[0].balance = 1_000;
  state.wallets[0].heldBalance = 97_975;
  state.ledger = state.ledger.filter((entry) => entry.sourceType !== 'PURCHASE_ORDER_SETTLEMENT');
  state.ledger[0].status = 'HELD';
  return state;
}

class FakePrisma {
  readonly platformWallet = { id: 1, currency: 'PHP', environment: 'SANDBOX' as const, balance: 0, heldBalance: 0, createdAt: POSTED_AT, updatedAt: POSTED_AT };
  readonly platformLedger: any[] = [];
  readonly writes = {
    walletUpserts: 0,
    walletUpdates: 0,
    ledgerCreates: 0,
    ledgerUpdates: 0,
    settlementUpdates: 0,
  };

  constructor(readonly state: FixtureState) {}

  private matchesLedger(entry: LedgerFixture, where: Record<string, unknown>) {
    if (where.sourceType !== undefined && entry.sourceType !== where.sourceType) return false;
    if (where.referenceId !== undefined && entry.referenceId !== where.referenceId) return false;
    if (where.deletedAt !== undefined && entry.deletedAt !== where.deletedAt) return false;
    return true;
  }

  readonly tx = {
    purchaseOrderSettlement: {
      findUnique: async (_args: any) => undefined,
      update: async (_args: any) => undefined,
    },
    wallet: {
      findUnique: async (_args: any) => undefined,
      upsert: async (_args: any) => undefined,
      update: async (_args: any) => undefined,
    },
    walletLedgerEntry: {
      findUnique: async (_args: any) => undefined,
      findMany: async (_args: any) => undefined,
      create: async (_args: any) => undefined,
      update: async (_args: any) => undefined,
    },
    platformWallet: {
      upsert: async (_args: any) => undefined,
      update: async (_args: any) => undefined,
    },
    platformWalletLedgerEntry: {
      findUnique: async (_args: any) => undefined,
      findFirst: async (_args: any) => undefined,
      create: async (_args: any) => undefined,
    },
  } as any;

  initialize() {
    this.tx.purchaseOrderSettlement.findUnique = async ({ where }: any) => (
      where.id === this.state.settlement.id ? this.state.settlement : null
    );
    this.tx.purchaseOrderSettlement.update = async ({ where, data }: any) => {
      assert.equal(where.id, this.state.settlement.id);
      this.writes.settlementUpdates += 1;
      Object.assign(this.state.settlement, data);
      return this.state.settlement;
    };
    this.tx.wallet.findUnique = async ({ where }: any) => {
      if (where.id !== undefined) return this.state.wallets.find((wallet) => wallet.id === where.id) ?? null;
      const key = where.orgId_environment;
      return this.state.wallets.find((wallet) => wallet.orgId === key.orgId && wallet.environment === key.environment) ?? null;
    };
    this.tx.wallet.upsert = async ({ where, create }: any) => {
      this.writes.walletUpserts += 1;
      const key = where.orgId_environment;
      const existing = this.state.wallets.find((wallet) => wallet.orgId === key.orgId && wallet.environment === key.environment);
      if (existing) return existing;
      const created: WalletFixture = {
        id: Math.max(0, ...this.state.wallets.map((wallet) => wallet.id)) + 1,
        createdAt: new Date(),
        deletedAt: null,
        ...create,
      };
      this.state.wallets.push(created);
      return created;
    };
    this.tx.wallet.update = async ({ where, data }: any) => {
      const wallet = this.state.wallets.find((candidate) => candidate.id === where.id);
      assert.ok(wallet);
      this.writes.walletUpdates += 1;
      if (data.balance?.increment !== undefined) wallet.balance += data.balance.increment;
      if (data.heldBalance?.decrement !== undefined) wallet.heldBalance -= data.heldBalance.decrement;
      if (data.updatedAt) wallet.updatedAt = data.updatedAt;
      return wallet;
    };
    this.tx.walletLedgerEntry.findUnique = async ({ where }: any) => {
      if (where.id !== undefined) return this.state.ledger.find((entry) => entry.id === where.id) ?? null;
      const key = where.walletId_sourceType_referenceId;
      return this.state.ledger.find((entry) => (
        entry.walletId === key.walletId
        && entry.sourceType === key.sourceType
        && entry.referenceId === key.referenceId
      )) ?? null;
    };
    this.tx.walletLedgerEntry.findMany = async ({ where, take }: any) => (
      this.state.ledger.filter((entry) => this.matchesLedger(entry, where)).slice(0, take)
    );
    this.tx.walletLedgerEntry.create = async ({ data }: any) => {
      this.writes.ledgerCreates += 1;
      const entry: LedgerFixture = {
        id: Math.max(0, ...this.state.ledger.map((candidate) => candidate.id)) + 1,
        createdAt: new Date(),
        deletedAt: null,
        ...data,
      };
      this.state.ledger.push(entry);
      return entry;
    };
    this.tx.walletLedgerEntry.update = async ({ where, data }: any) => {
      const entry = this.state.ledger.find((candidate) => candidate.id === where.id);
      assert.ok(entry);
      this.writes.ledgerUpdates += 1;
      Object.assign(entry, data);
      return entry;
    };
    this.tx.platformWallet.upsert = async () => this.platformWallet;
    this.tx.platformWallet.update = async ({ data }: any) => {
      if (data.balance?.increment !== undefined) this.platformWallet.balance += data.balance.increment;
      if (data.updatedAt) this.platformWallet.updatedAt = data.updatedAt;
      return this.platformWallet;
    };
    this.tx.platformWalletLedgerEntry.findUnique = async ({ where }: any) => {
      const key = where.walletId_sourceType_referenceId;
      return this.platformLedger.find((entry) => entry.walletId === key.walletId && entry.sourceType === key.sourceType && entry.referenceId === key.referenceId) ?? null;
    };
    this.tx.platformWalletLedgerEntry.findFirst = async ({ where }: any) => this.platformLedger.find((entry) => entry.sourceType === where.sourceType && entry.referenceId === where.referenceId && entry.environment === where.environment) ?? null;
    this.tx.platformWalletLedgerEntry.create = async ({ data }: any) => {
      const entry = { ...data, createdAt: new Date() };
      this.platformLedger.push(entry);
      return entry;
    };
    return this;
  }

  async $transaction<T>(callback: (tx: any) => Promise<T>) {
    return callback(this.tx);
  }
}

function serviceFor(state: FixtureState) {
  const prisma = new FakePrisma(state).initialize();
  const emitted: unknown[] = [];
  const realtime = { emitToOrganization: (...args: unknown[]) => emitted.push(args) };
  const service = new SettlementWalletPostingService(prisma as any, realtime as any);
  return { emitted, prisma, service };
}

function responseCode(error: unknown) {
  if (!(error instanceof BadRequestException)) return undefined;
  const response = error.getResponse();
  return typeof response === 'object' && response !== null && 'code' in response
    ? (response as { code?: string }).code
    : undefined;
}

async function expectCode(service: SettlementWalletPostingService, settlementId: string, code: string) {
  const originalError = console.error;
  console.error = () => undefined;
  try {
    await assert.rejects(
      () => service.postSettlementToWallet(settlementId),
      (error: unknown) => responseCode(error) === code,
    );
  } finally {
    console.error = originalError;
  }
}

async function run() {
  let assertions = 0;

  {
    const state = firstPostingFixture();
    const { emitted, prisma, service } = serviceFor(state);
    const result = await service.postSettlementToWallet(state.settlement.id);
    assert.equal(result.posted, true);
    assert.equal(state.wallets[0].balance, 98_975);
    assert.equal(state.wallets[0].heldBalance, 0);
    assert.equal(state.ledger.find((entry) => entry.id === 4)?.status, 'RELEASED');
    assert.equal(prisma.writes.ledgerCreates, 1);
    assert.equal(prisma.writes.settlementUpdates, 1);
    assert.equal(prisma.platformWallet.balance, 25);
    assert.equal(prisma.platformLedger.length, 1);
    assert.equal(prisma.platformLedger[0].sourceType, 'PURCHASE_ORDER_PLATFORM_FEE');
    assert.equal(prisma.platformLedger[0].referenceId, state.settlement.id);
    assert.equal(prisma.platformLedger[0].amount, 25);
    assert.equal(emitted.length, 1);
    assertions += 1;
  }

  {
    const state = firstPostingFixture();
    const { prisma, service } = serviceFor(state);
    await service.postSettlementToWallet(state.settlement.id);
    const writesAfterFirstPosting = { ...prisma.writes };
    const platformBalanceAfterFirstPosting = prisma.platformWallet.balance;
    const platformLedgerCountAfterFirstPosting = prisma.platformLedger.length;
    const result = await service.postSettlementToWallet(state.settlement.id);
    assert.equal(result.posted, false);
    assert.deepEqual(prisma.writes, writesAfterFirstPosting);
    assert.equal(prisma.platformWallet.balance, platformBalanceAfterFirstPosting);
    assert.equal(prisma.platformLedger.length, platformLedgerCountAfterFirstPosting);
    assertions += 1;
  }

  {
    const state = postedFixture();
    const { service } = serviceFor(state);
    const result = await service.postSettlementToWallet(state.settlement.id);
    assert.equal(result.entry.id, state.settlement.walletLedgerEntryId);
    assert.equal(result.entry.createdAt, state.settlement.walletPostedAt);
    assertions += 1;
  }

  {
    const state = postedFixture();
    const { emitted, prisma, service } = serviceFor(state);
    const result = await service.postSettlementToWallet(state.settlement.id);
    assert.equal(result.posted, false);
    assert.equal(state.ledger.find((entry) => entry.id === 4)?.status, 'RELEASED');
    assert.equal(prisma.writes.ledgerUpdates, 0);
    assert.equal(emitted.length, 0);
    assertions += 1;
  }

  {
    const state = postedFixture();
    state.ledger.find((entry) => entry.id === 4)!.status = 'HELD';
    const before = structuredClone(state);
    const { prisma, service } = serviceFor(state);
    await expectCode(service, state.settlement.id, 'SETTLEMENT_POSTED_ESCROW_STILL_HELD');
    assert.deepEqual(state, before);
    assert.deepEqual(prisma.writes, { walletUpserts: 0, walletUpdates: 0, ledgerCreates: 0, ledgerUpdates: 0, settlementUpdates: 0 });
    assertions += 1;
  }

  {
    const state = postedFixture();
    state.ledger = state.ledger.filter((entry) => entry.id !== 6);
    const { service } = serviceFor(state);
    await expectCode(service, state.settlement.id, 'SETTLEMENT_LEDGER_MISSING');
    assertions += 1;
  }

  {
    const state = postedFixture();
    state.ledger.find((entry) => entry.id === 6)!.amount = 97_974;
    const { service } = serviceFor(state);
    await expectCode(service, state.settlement.id, 'SETTLEMENT_LEDGER_AMOUNT_MISMATCH');
    assertions += 1;
  }

  {
    const state = postedFixture();
    state.ledger.find((entry) => entry.id === 6)!.walletId = 99;
    const { service } = serviceFor(state);
    await expectCode(service, state.settlement.id, 'SETTLEMENT_LEDGER_WRONG_WALLET');
    assertions += 1;
  }

  {
    const state = postedFixture();
    state.ledger.find((entry) => entry.id === 6)!.environment = 'PRODUCTION';
    const { service } = serviceFor(state);
    await expectCode(service, state.settlement.id, 'SETTLEMENT_ENVIRONMENT_MISMATCH');
    assertions += 1;
  }

  {
    const state = postedFixture();
    state.ledger.push({ ...state.ledger.find((entry) => entry.id === 6)!, id: 7, walletId: 99 });
    const { service } = serviceFor(state);
    await expectCode(service, state.settlement.id, 'SETTLEMENT_LEDGER_DUPLICATE');
    assertions += 1;
  }

  {
    const state = postedFixture();
    const originalBalance = state.wallets[0].balance;
    const { prisma, service } = serviceFor(state);
    await service.postSettlementToWallet(state.settlement.id);
    assert.equal(state.wallets[0].balance, originalBalance);
    assert.equal(prisma.writes.walletUpdates, 0);
    assertions += 1;
  }

  {
    const state = postedFixture();
    const originalHeldBalance = state.wallets[0].heldBalance;
    const { prisma, service } = serviceFor(state);
    await service.postSettlementToWallet(state.settlement.id);
    assert.equal(state.wallets[0].heldBalance, originalHeldBalance);
    assert.equal(prisma.writes.walletUpdates, 0);
    assertions += 1;
  }

  {
    const state = postedFixture();
    const originalLedgerCount = state.ledger.length;
    const { prisma, service } = serviceFor(state);
    await service.postSettlementToWallet(state.settlement.id);
    assert.equal(state.ledger.length, originalLedgerCount);
    assert.equal(prisma.writes.ledgerCreates, 0);
    assertions += 1;
  }

  assert.equal(assertions, 13);
  console.log(`Settlement wallet posting verification PASS (${assertions} targeted cases).`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
