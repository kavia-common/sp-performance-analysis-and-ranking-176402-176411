import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getHealth, getSymbols, postRun, getStatus, getLatest, exportRun } from '../api/client';
import { downloadArrayAsCsv } from '../utils/csv';

/**
 * PUBLIC_INTERFACE
 * useRankingData manages formula selection, filters, pagination, sorting, run triggering, status polling,
 * fetching latest results, and export initiation.
 */
export default function useRankingData() {
  const [formulaMode, setFormulaMode] = useState('both');
  const [filters, setFilters] = useState({ sectors: [], marketCapMin: '', marketCapMax: '', completeness: '' });
  const [sectors, setSectors] = useState([]);
  const [health, setHealth] = useState(null);

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('combined_rank');
  const [sortDir, setSortDir] = useState('asc');

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [runId, setRunId] = useState(null);
  const [runStatus, setRunStatus] = useState(null);
  const [runInProgress, setRunInProgress] = useState(false);
  const pollRef = useRef(null);

  // Initial health and symbols load
  useEffect(() => {
    (async () => {
      const h = await getHealth();
      setHealth(h);
      try {
        const sym = await getSymbols();
        // Unique sectors from API or computed
        const apiSectors = sym?.sectors || Array.from(new Set((sym?.symbols || []).map((s) => s.sector).filter(Boolean)));
        setSectors(apiSectors);
      } catch (e) {
        // ignore sectors error; UI handles empty list
      }
    })();
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      // Align param names with backend expectations
      const params = {
        page,
        pageSize,
        sortBy,
        sortDir,
        formula_mode: formulaMode,
      };
      if (filters.sectors?.length) params.sectors = filters.sectors;
      if (filters.marketCapMin !== '') params.marketCapMin = filters.marketCapMin;
      if (filters.marketCapMax !== '') params.marketCapMax = filters.marketCapMax;
      if (filters.completeness !== '') params.completeness = filters.completeness;

      const res = await getLatest(params);
      const rows = res?.items || [];
      const count = typeof res?.total === 'number' ? res.total : rows.length;
      setData(Array.isArray(rows) ? rows : []);
      setTotal(count);
    } catch (e) {
      setError(e?.message || 'Failed to load data');
      setData([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, sortBy, sortDir, formulaMode, filters]);

  // Load whenever dependencies change
  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startPollingStatus = (rid) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const st = await getStatus(rid);
        setRunStatus(st);
        const status = st?.status || st?.state;
        if (status && ['completed', 'failed', 'error'].includes(status)) {
          setRunInProgress(false);
          stopPolling();
          loadData();
        }
      } catch (e) {
        // stop on persistent error to avoid noise
        stopPolling();
        setRunInProgress(false);
      }
    }, 2000);
  };

  const triggerRun = useCallback(async () => {
    setRunInProgress(true);
    setRunStatus({ status: 'queued', progress: 0 });
    try {
      const res = await postRun(formulaMode, { filters });
      const rid = res?.run_id || res?.id;
      setRunId(rid || null);
      // Keep latest server-provided status shape
      setRunStatus({ ...(res || {}), status: 'running', progress: 0 });
      if (rid) startPollingStatus(rid);
      else {
        // No run id; fallback: wait then refresh
        setTimeout(() => {
          setRunInProgress(false);
          loadData();
        }, 3000);
      }
    } catch (e) {
      setRunInProgress(false);
      setRunStatus({ status: 'failed', message: e?.message });
      setError(e?.message || 'Run failed');
    }
  }, [formulaMode, filters, loadData]);

  useEffect(() => () => stopPolling(), []);

  const setSort = (key, dir) => {
    setSortBy(key);
    setSortDir(dir);
  };

  const canExport = useMemo(() => {
    // Provide export if we have runId or at least some data for CSV fallback
    return !!runId || (Array.isArray(data) && data.length > 0);
  }, [runId, data]);

  const exportCsv = useCallback(() => {
    // Prefer backend export URL if available and runId exists
    const url = exportRun(runId, 'csv');
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    // Fallback to client CSV
    if (data?.length) {
      downloadArrayAsCsv(data, 'sp_rankings.csv');
    }
  }, [runId, data]);

  const exportExcel = useCallback(() => {
    const url = exportRun(runId, 'excel');
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    // If backend not available yet, provide CSV fallback with .csv name
    if (data?.length) {
      downloadArrayAsCsv(data, 'sp_rankings.csv');
    }
  }, [runId, data]);

  return {
    formulaMode,
    setFormulaMode,
    filters,
    setFilters,
    sectors,
    isLoading,
    error,
    page,
    setPage,
    pageSize,
    setPageSize,
    sortBy,
    sortDir,
    setSort,
    data,
    total,
    runStatus,
    runId,
    runInProgress,
    triggerRun,
    refresh,
    canExport,
    exportCsv,
    exportExcel,
    health,
  };
}
