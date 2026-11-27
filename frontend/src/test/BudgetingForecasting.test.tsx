/**
 * @file        BudgetingForecasting.test.tsx
 * @project     PrathamOne Academy Coaching Institute Management System
 * @module      frontend.test
 *
 * @author      Jawahar R. Mallah
 * @organization Smritisys & AITDL Networks
 * @client      Prashant Academy Coaching Institute
 * @copyright   Copyright (c) 2026 PrathamOne EduOS
 * @license     Proprietary
 *
 * @version     1.0.0
 * @created     2026-11-27
 * @updated     2026-11-27
 *
 * @description Vitest suite verifying View-First Edit Mode governance, budget variance rendering, and What-If forecasting simulation.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BudgetingForecastingWorkspace from '../pages/BudgetingForecastingWorkspace'
import { useAuthStore } from '../store/authStore'
import { useEditModeStore } from '../store/editModeStore'

const {
  listBudgetsMock,
  getBudgetVarianceMock,
  upsertBudgetLinesMock,
  listForecastScenariosMock,
  getForecastOverviewMock,
  simulateForecastMock,
} = vi.hoisted(() => ({
  listBudgetsMock: vi.fn(),
  getBudgetVarianceMock: vi.fn(),
  upsertBudgetLinesMock: vi.fn(),
  listForecastScenariosMock: vi.fn(),
  getForecastOverviewMock: vi.fn(),
  simulateForecastMock: vi.fn(),
}))

vi.mock('recharts', () => {
  const MockBox = ({ children }: any) => <div>{children}</div>
  return {
    ResponsiveContainer: MockBox,
    ComposedChart: MockBox,
    Area: MockBox,
    Bar: MockBox,
    Line: MockBox,
    XAxis: MockBox,
    YAxis: MockBox,
    CartesianGrid: MockBox,
    Tooltip: MockBox,
    Legend: MockBox,
  }
})

vi.mock('../api/endpoints', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../api/endpoints')>()
  return {
    ...actual,
    financeApi: {
      ...actual.financeApi,
      listBudgets: listBudgetsMock,
      getBudgetVariance: getBudgetVarianceMock,
      upsertBudgetLines: upsertBudgetLinesMock,
      listForecastScenarios: listForecastScenariosMock,
      getForecastOverview: getForecastOverviewMock,
      simulateForecast: simulateForecastMock,
    },
  }
})

describe('BudgetingForecastingWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useEditModeStore.getState().resetAll()
    useAuthStore.setState({
      token: 'jwt-admin-token',
      user: {
        id: 1,
        username: 'admin',
        email: 'admin@prashant.test',
        first_name: 'Admin',
        last_name: 'User',
        role: 'admin',
      } as any,
      selectedInstitutionId: 1,
    })

    listBudgetsMock.mockResolvedValue({
      data: [
        {
          id: 11,
          institution_id: 1,
          fiscal_year_label: 'FY 2026-27',
          name: 'FY 2026-27 Operating Plan',
          plan_type: 'operating',
          granularity: 'monthly',
          start_date: '2026-04-01',
          end_date: '2027-03-31',
          version_number: 1,
          status: 'draft',
          enforcement_mode: 'soft_warn',
          planned_inflow: 500000,
          planned_outflow: 300000,
          planned_net_surplus: 200000,
          line_count: 1,
        },
      ],
    })

    getBudgetVarianceMock.mockResolvedValue({
      data: {
        plan: {
          id: 11,
          name: 'FY 2026-27 Operating Plan',
          fiscal_year_label: 'FY 2026-27',
          plan_type: 'operating',
          granularity: 'monthly',
          version_number: 1,
          status: 'draft',
          enforcement_mode: 'soft_warn',
          start_date: '2026-04-01',
          end_date: '2027-03-31',
        },
        summary: {
          revenue_budget: 500000,
          revenue_actual: 320000,
          revenue_realization_pct: 64.0,
          cost_budget: 300000,
          cost_actual: 180000,
          cost_pending: 5000,
          cost_utilization_pct: 60.0,
          net_margin_budget: 200000,
          net_margin_actual: 140000,
        },
        period_summary: [
          {
            period_start: '2026-11-01',
            period_label: 'Nov 2026',
            revenue_budget: 500000,
            revenue_actual: 320000,
            cost_budget: 300000,
            cost_actual: 180000,
            cost_pending: 5000,
            net_budget: 200000,
            net_actual: 140000,
          },
        ],
        lines: [
          {
            id: 101,
            period_start: '2026-11-01',
            period_end: '2026-11-30',
            period_label: 'Nov 2026',
            line_direction: 'outflow_cap',
            source_domain: 'expense_category',
            line_label: 'Marketing & Ads',
            planned_amount: 40000,
            actual_amount: 25000,
            pending_amount: 0,
            variance_amount: 15000,
            utilization_pct: 62.5,
            warning_threshold_pct: 85,
            status: 'on_track',
          },
        ],
      },
    })

    listForecastScenariosMock.mockResolvedValue({ data: [] })
    const forecastPayload = {
      scenario: { name: 'Live Baseline', scenario_type: 'baseline', horizon_months: 6, assumptions: {} },
      run_batch_id: 'batch-1',
      summary: {
        starting_cash_register: 25000,
        opening_bank_balance: 100000,
        starting_liquidity: 125000,
        total_projected_inflows: 450000,
        total_projected_outflows: 280000,
        net_projected_surplus: 170000,
        ending_liquidity: 295000,
        trough_month: 'Nov 2026',
        trough_liquidity: 125000,
        runway_months: null,
        runway_status: 'self_sustaining',
      },
      drivers_context: {},
      projections: [
        {
          period_start: '2026-11-01',
          period_end: '2026-11-30',
          period_label: 'Nov 2026',
          projected_fee_collections: 180000,
          projected_pipeline_admissions: 20000,
          projected_concessions: 0,
          projected_refunds: 4000,
          projected_total_inflows: 196000,
          projected_faculty_payroll: 70000,
          projected_staff_payroll: 25000,
          projected_recurring_opex: 30000,
          projected_variable_opex: 10000,
          projected_total_outflows: 135000,
          projected_net_cashflow: 61000,
          projected_ending_liquidity: 186000,
          confidence_low: 155000,
          confidence_high: 215000,
        },
      ],
    }
    getForecastOverviewMock.mockResolvedValue({ data: forecastPayload })
    simulateForecastMock.mockResolvedValue({ data: forecastPayload })
    upsertBudgetLinesMock.mockResolvedValue({ data: { message: 'Budget allocations updated', id: 11, status: 'draft' } })
  })

  it('defaults to View Mode and unlocks inline draft allocation editing only after Edit Mode activation', async () => {
    render(
      <MemoryRouter initialEntries={['/finance/budgets']}>
        <BudgetingForecastingWorkspace />
      </MemoryRouter>,
    )

    expect(await screen.findByText('Marketing & Ads')).toBeTruthy()
    // Read-only by default (Rule 010)
    expect(screen.queryByLabelText('Planned amount for Marketing & Ads Nov 2026')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: /Enable Edit Mode/i }))
    const input = await screen.findByLabelText('Planned amount for Marketing & Ads Nov 2026')
    fireEvent.change(input, { target: { value: '55000' } })
    fireEvent.click(screen.getByRole('button', { name: /Save & Exit/i }))

    await waitFor(() => {
      expect(upsertBudgetLinesMock).toHaveBeenCalledWith(
        11,
        [expect.objectContaining({ id: 101, planned_amount: 55000 })],
        1,
      )
    })
  })

  it('switches to Forecasts tab and triggers server-side What-If simulation', async () => {
    render(
      <MemoryRouter initialEntries={['/finance/forecasts']}>
        <BudgetingForecastingWorkspace />
      </MemoryRouter>,
    )

    expect(await screen.findByText('What-If Simulator')).toBeTruthy()
    expect(screen.getByText('Nov 2026')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Run What-If Projection/i }))
    await waitFor(() => {
      expect(simulateForecastMock).toHaveBeenCalled()
    })
  })
})
