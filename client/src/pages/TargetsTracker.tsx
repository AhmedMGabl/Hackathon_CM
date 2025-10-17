import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { configApi } from '../lib/api';
import { tokens } from '../config/tokens';

interface Config {
  ccTarget: number;
  scTarget: number;
  upTarget: number;
  fixedTarget: number;
  ccWeight: number;
  scWeight: number;
  upWeight: number;
  fixedWeight: number;
  pacingWeek: number;
}

export default function TargetsTracker() {
  const { user, logout, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [editedConfig, setEditedConfig] = useState<Config | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await configApi.get();
      const configData = response.data;
      setConfig(configData);
      setEditedConfig(configData);
    } catch (err) {
      console.error('Failed to load config:', err);
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleTargetChange = (field: keyof Config, value: number) => {
    if (!isAdmin) return;
    setEditedConfig((prev) => (prev ? { ...prev, [field]: value } : null));
    setError('');
    setSuccess('');
  };

  const handleWeightChange = (field: keyof Config, value: number) => {
    if (!isAdmin) return;
    setEditedConfig((prev) => (prev ? { ...prev, [field]: value } : null));
    setError('');
    setSuccess('');
  };

  const calculateWeightSum = () => {
    if (!editedConfig) return 0;
    return editedConfig.ccWeight + editedConfig.scWeight + editedConfig.upWeight + editedConfig.fixedWeight;
  };

  const handleSave = async () => {
    if (!isAdmin || !editedConfig) return;

    const sum = calculateWeightSum();
    if (sum !== 100) {
      setError(`Weights must equal 100% (currently ${sum}%)`);
      return;
    }

    try {
      setSaving(true);
      setError('');
      await configApi.update(editedConfig);
      setConfig(editedConfig);
      setSuccess('Configuration saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to save config:', err);
      setError(err.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setEditedConfig(config);
    setError('');
    setSuccess('');
  };

  const hasChanges = JSON.stringify(config) !== JSON.stringify(editedConfig);
  const weightSum = calculateWeightSum();
  const isWeightValid = weightSum === 100;

  const getPacingMultiplier = (week: number, currentWeek: number) => {
    if (!editedConfig) return 1;
    const weeksRemaining = 5 - currentWeek;
    return week <= currentWeek ? 1 / weeksRemaining : 0;
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: tokens.colors.surface.dark, padding: '24px' }}>
        <div style={{ color: tokens.colors.neutral[400] }}>Loading...</div>
      </div>
    );
  }

  if (!editedConfig) {
    return (
      <div style={{ minHeight: '100vh', background: tokens.colors.surface.dark, padding: '24px' }}>
        <div style={{ color: tokens.colors.danger[400] }}>Failed to load configuration</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: tokens.colors.surface.dark }}>
      {/* Header */}
      <header
        style={{
          background: tokens.colors.surface.card,
          borderBottom: `1px solid ${tokens.colors.neutral[800]}`,
          padding: '16px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: tokens.colors.primary[600] }}>CMetrics</h1>
            <p style={{ fontSize: '14px', color: tokens.colors.neutral[400] }}>Targets & Weight Configuration</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <a href="/overview" style={{ color: tokens.colors.neutral[300], fontSize: '14px', textDecoration: 'none' }}>
              ← Back to Overview
            </a>
            <span style={{ color: tokens.colors.neutral[300], fontSize: '14px' }}>
              {user?.firstName} {user?.lastName} ({user?.role})
            </span>
            <button
              onClick={logout}
              style={{
                padding: '8px 16px',
                background: tokens.colors.neutral[800],
                color: tokens.colors.neutral[200],
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Access Level Notice */}
        {!isAdmin && (
          <div
            style={{
              background: tokens.colors.warning[900] + '20',
              border: `1px solid ${tokens.colors.warning[700]}`,
              color: tokens.colors.warning[400],
              padding: '16px',
              borderRadius: tokens.radii.lg,
              marginBottom: '24px',
              fontSize: '14px',
            }}
          >
            You are viewing this configuration in read-only mode. Only admins can edit targets and weights.
          </div>
        )}

        {/* Error/Success Messages */}
        {error && (
          <div
            style={{
              background: tokens.colors.danger[900] + '20',
              border: `1px solid ${tokens.colors.danger[700]}`,
              color: tokens.colors.danger[400],
              padding: '16px',
              borderRadius: tokens.radii.lg,
              marginBottom: '24px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              background: tokens.colors.success[900] + '20',
              border: `1px solid ${tokens.colors.success[700]}`,
              color: tokens.colors.success[400],
              padding: '16px',
              borderRadius: tokens.radii.lg,
              marginBottom: '24px',
              fontSize: '14px',
            }}
          >
            {success}
          </div>
        )}

        {/* Targets Configuration */}
        <div
          style={{
            background: tokens.colors.surface.card,
            padding: '32px',
            borderRadius: tokens.radii.lg,
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: tokens.colors.neutral[100], marginBottom: '24px' }}>
            Performance Targets
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <TargetSlider
              label="Class Consumption (CC)"
              value={editedConfig.ccTarget}
              onChange={(v) => handleTargetChange('ccTarget', v)}
              disabled={!isAdmin}
              min={0}
              max={100}
              unit="%"
            />
            <TargetSlider
              label="Super-CC (SC)"
              value={editedConfig.scTarget}
              onChange={(v) => handleTargetChange('scTarget', v)}
              disabled={!isAdmin}
              min={0}
              max={100}
              unit="%"
            />
            <TargetSlider
              label="Upgrade (UP)"
              value={editedConfig.upTarget}
              onChange={(v) => handleTargetChange('upTarget', v)}
              disabled={!isAdmin}
              min={0}
              max={100}
              unit="%"
            />
            <TargetSlider
              label="Fixed"
              value={editedConfig.fixedTarget}
              onChange={(v) => handleTargetChange('fixedTarget', v)}
              disabled={!isAdmin}
              min={0}
              max={100}
              unit="%"
            />
          </div>
        </div>

        {/* Weights Configuration */}
        <div
          style={{
            background: tokens.colors.surface.card,
            padding: '32px',
            borderRadius: tokens.radii.lg,
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: tokens.colors.neutral[100] }}>Metric Weights</h2>
            <div
              style={{
                padding: '8px 16px',
                background: isWeightValid ? tokens.colors.success[900] + '20' : tokens.colors.danger[900] + '20',
                color: isWeightValid ? tokens.colors.success[400] : tokens.colors.danger[400],
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 700,
              }}
            >
              Total: {weightSum}%
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <WeightSlider
              label="CC Weight"
              value={editedConfig.ccWeight}
              onChange={(v) => handleWeightChange('ccWeight', v)}
              disabled={!isAdmin}
            />
            <WeightSlider
              label="SC Weight"
              value={editedConfig.scWeight}
              onChange={(v) => handleWeightChange('scWeight', v)}
              disabled={!isAdmin}
            />
            <WeightSlider
              label="UP Weight"
              value={editedConfig.upWeight}
              onChange={(v) => handleWeightChange('upWeight', v)}
              disabled={!isAdmin}
            />
            <WeightSlider
              label="Fixed Weight"
              value={editedConfig.fixedWeight}
              onChange={(v) => handleWeightChange('fixedWeight', v)}
              disabled={!isAdmin}
            />
          </div>

          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              background: tokens.colors.surface.dark,
              borderRadius: tokens.radii.lg,
              fontSize: '14px',
              color: tokens.colors.neutral[400],
            }}
          >
            <strong style={{ color: tokens.colors.neutral[200] }}>Note:</strong> Weights must sum to exactly 100%. They
            determine how each metric contributes to the overall weighted score.
          </div>
        </div>

        {/* Pacing Configuration */}
        <div
          style={{
            background: tokens.colors.surface.card,
            padding: '32px',
            borderRadius: tokens.radii.lg,
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: tokens.colors.neutral[100], marginBottom: '24px' }}>
            Weekly Pacing
          </h2>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', color: tokens.colors.neutral[300], marginBottom: '8px' }}>
              Current Week of Month
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {[1, 2, 3, 4].map((week) => (
                <button
                  key={week}
                  onClick={() => handleTargetChange('pacingWeek', week)}
                  disabled={!isAdmin}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background:
                      editedConfig.pacingWeek === week ? tokens.colors.primary[600] : tokens.colors.neutral[800],
                    color: editedConfig.pacingWeek === week ? 'white' : tokens.colors.neutral[300],
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isAdmin ? 'pointer' : 'not-allowed',
                    opacity: isAdmin ? 1 : 0.6,
                  }}
                >
                  Week {week}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: '16px',
              background: tokens.colors.surface.dark,
              borderRadius: tokens.radii.lg,
            }}
          >
            <div style={{ fontSize: '14px', color: tokens.colors.neutral[400], marginBottom: '16px' }}>
              Pacing Multipliers (higher number = more weight):
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              {[1, 2, 3, 4].map((week) => {
                const multiplier = getPacingMultiplier(week, editedConfig.pacingWeek);
                const divisor = 5 - week;
                return (
                  <div
                    key={week}
                    style={{
                      padding: '12px',
                      background: week === editedConfig.pacingWeek ? tokens.colors.primary[900] + '30' : 'transparent',
                      border: `1px solid ${tokens.colors.neutral[700]}`,
                      borderRadius: '8px',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: tokens.colors.neutral[400], marginBottom: '4px' }}>
                      Week {week}
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 700, color: tokens.colors.neutral[100] }}>
                      {week <= editedConfig.pacingWeek ? `÷${divisor}` : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Save/Reset Buttons */}
        {isAdmin && (
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
            <button
              onClick={handleReset}
              disabled={!hasChanges || saving}
              style={{
                padding: '12px 24px',
                background: tokens.colors.neutral[800],
                color: tokens.colors.neutral[200],
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: hasChanges && !saving ? 'pointer' : 'not-allowed',
                opacity: hasChanges && !saving ? 1 : 0.5,
              }}
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || !isWeightValid || saving}
              style={{
                padding: '12px 24px',
                background: hasChanges && isWeightValid && !saving ? tokens.colors.primary[600] : tokens.colors.neutral[700],
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: hasChanges && isWeightValid && !saving ? 'pointer' : 'not-allowed',
                opacity: hasChanges && isWeightValid && !saving ? 1 : 0.5,
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled: boolean;
  min?: number;
  max?: number;
  unit?: string;
}

function TargetSlider({ label, value, onChange, disabled, min = 0, max = 100, unit = '%' }: SliderProps) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <label style={{ fontSize: '14px', color: tokens.colors.neutral[300] }}>{label}</label>
        <span style={{ fontSize: '16px', fontWeight: 700, color: tokens.colors.neutral[100] }}>
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          background: `linear-gradient(to right, ${tokens.colors.primary[600]} 0%, ${tokens.colors.primary[600]} ${value}%, ${tokens.colors.neutral[700]} ${value}%, ${tokens.colors.neutral[700]} 100%)`,
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      />
    </div>
  );
}

function WeightSlider({ label, value, onChange, disabled }: Omit<SliderProps, 'min' | 'max' | 'unit'>) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <label style={{ fontSize: '14px', color: tokens.colors.neutral[300] }}>{label}</label>
        <span style={{ fontSize: '16px', fontWeight: 700, color: tokens.colors.neutral[100] }}>{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        style={{
          width: '100%',
          height: '6px',
          borderRadius: '3px',
          background: `linear-gradient(to right, ${tokens.colors.success[600]} 0%, ${tokens.colors.success[600]} ${value}%, ${tokens.colors.neutral[700]} ${value}%, ${tokens.colors.neutral[700]} 100%)`,
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      />
    </div>
  );
}
