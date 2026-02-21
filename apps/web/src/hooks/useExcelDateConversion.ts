export const useExcelDateConversion = () => {
  const excelDateToISOString = (serial: string | number | undefined | null): string | undefined => {
    if (!serial) return undefined;
    if (typeof serial === 'string' && serial.includes('-')) return serial;
    if (typeof serial === 'number') {
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    return undefined;
  };

  return {
    excelDateToISOString,
  };
};