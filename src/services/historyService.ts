/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConsultationRecord } from "../types";

const HISTORY_KEY = 'medicare_consultation_history';

export const historyService = {
  getRecords(): ConsultationRecord[] {
    try {
      const data = localStorage.getItem(HISTORY_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      return [];
    }
  },

  saveRecord(record: ConsultationRecord): void {
    try {
      const records = this.getRecords();
      records.unshift(record); // Add to beginning
      localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
    } catch (err) {
      console.error("Failed to save history:", err);
    }
  },

  deleteRecord(id: string): void {
    try {
      const records = this.getRecords();
      const filtered = records.filter(r => r.id !== id);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  }
};
