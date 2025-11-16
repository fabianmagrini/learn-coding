import { routeToAccountType, AdapterRegistry } from '../adapter';
import { BankAdapter } from '../bankAdapter';

describe('Adapter Registry', () => {
  it('should register and retrieve adapters', () => {
    const registry = new AdapterRegistry();
    const bankAdapter = new BankAdapter();

    registry.register(bankAdapter);

    const retrieved = registry.getAdapter('bank');
    expect(retrieved).toBe(bankAdapter);
  });

  it('should return undefined for unknown adapter', () => {
    const registry = new AdapterRegistry();
    const retrieved = registry.getAdapter('bank');
    expect(retrieved).toBeUndefined();
  });

  it('should check if adapter exists', () => {
    const registry = new AdapterRegistry();
    const bankAdapter = new BankAdapter();

    registry.register(bankAdapter);

    expect(registry.hasAdapter('bank')).toBe(true);
    expect(registry.hasAdapter('creditcard')).toBe(false);
  });

  it('should get all adapters', () => {
    const registry = new AdapterRegistry();
    const bankAdapter = new BankAdapter();

    registry.register(bankAdapter);

    const all = registry.getAllAdapters();
    expect(all).toHaveLength(1);
    expect(all[0]).toBe(bankAdapter);
  });
});

describe('routeToAccountType', () => {
  it('should route bank account IDs correctly', () => {
    expect(routeToAccountType('BNK-001')).toBe('bank');
    expect(routeToAccountType('BNK-999')).toBe('bank');
  });

  it('should route credit card account IDs correctly', () => {
    expect(routeToAccountType('CC-001')).toBe('creditcard');
  });

  it('should route loan account IDs correctly', () => {
    expect(routeToAccountType('LOAN-001')).toBe('loan');
  });

  it('should route investment account IDs correctly', () => {
    expect(routeToAccountType('INV-001')).toBe('investment');
  });

  it('should route legacy account IDs correctly', () => {
    expect(routeToAccountType('LEG-001')).toBe('legacy');
  });

  it('should route crypto account IDs correctly', () => {
    expect(routeToAccountType('CRY-001')).toBe('crypto');
  });

  it('should default to bank for unknown prefixes', () => {
    expect(routeToAccountType('XYZ-001')).toBe('bank');
    expect(routeToAccountType('unknown')).toBe('bank');
  });
});
