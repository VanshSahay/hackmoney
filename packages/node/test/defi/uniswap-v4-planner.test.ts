/**
 * Uniswap v4 SDK planner encoding tests
 */
import { describe, it, expect } from 'vitest';
import { Actions, V4Planner, type SwapExactInSingle } from '@uniswap/v4-sdk';
import { RoutePlanner, CommandType } from '@uniswap/universal-router-sdk';

describe('Uniswap v4 SDK planner encoding', () => {
  it('encodes a single-hop exact-in swap via route planner', () => {
    const swapConfig: SwapExactInSingle = {
      poolKey: {
        currency0: '0x0000000000000000000000000000000000000001',
        currency1: '0x0000000000000000000000000000000000000002',
        fee: 3000,
        tickSpacing: 60,
        hooks: '0x0000000000000000000000000000000000000000',
      },
      zeroForOne: true,
      amountIn: '1000000',
      amountOutMinimum: '900000',
      hookData: '0x',
    };
    
    const v4Planner = new V4Planner();
    v4Planner.addAction(Actions.SWAP_EXACT_IN_SINGLE, [swapConfig]);
    v4Planner.addAction(Actions.SETTLE_ALL, [swapConfig.poolKey.currency0, swapConfig.amountIn]);
    v4Planner.addAction(Actions.TAKE_ALL, [swapConfig.poolKey.currency1, swapConfig.amountOutMinimum]);
    
    const encodedActions = v4Planner.finalize();
    const routePlanner = new RoutePlanner();
    routePlanner.addCommand(CommandType.V4_SWAP, [encodedActions]);
    
    expect(routePlanner.commands).toBe('0x10');
    expect(routePlanner.inputs).toHaveLength(1);
    expect(routePlanner.inputs[0]).toMatch(/^0x[0-9a-fA-F]+$/);
  });
});
