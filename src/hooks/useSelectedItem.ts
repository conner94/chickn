"use client";

import { useState } from "react";
import { DEFAULT_ITEM_ID, ItemId } from "@/constants/items";

/** 선택한 아이템. 접속할 때마다 항상 치킨(DEFAULT_ITEM_ID)부터 시작한다 (저장하지 않음). */
export function useSelectedItem() {
  return useState<ItemId>(DEFAULT_ITEM_ID);
}
