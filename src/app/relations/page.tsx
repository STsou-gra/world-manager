// src/app/relations/page.tsx
'use client';

import { useEffect, useState, useRef, MouseEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { World, Organization, Character, CharacterRelation, OrganizationRelation, CharacterOrgRelation, RelationLayout } from '../../types/database';
import Link from 'next/link';

type Position = { x: number; y: number };
type Size = { width: number; height: number };
type PositionsMap = Record<string, Position>;
type SizesMap = Record<string, Size>;

type NodeCoordInfo = {
  x: number;
  y: number;
  w: number;
  h: number;
};

// カードおよびコンテナのデフォルトサイズ定数
const CHAR_CARD_WIDTH = 240;
const CHAR_CARD_HEIGHT = 112;
const DEFAULT_ORG_BOX_WIDTH = 540;
const DEFAULT_ORG_BOX_HEIGHT = 380;

// 組織が関わる線（組織→組織、キャラ→組織）
type BoxEdge = {
  id: string;
  kind: 'org' | 'char-org';
  sourceKey: string;
  targetKey: string;
  label: string;
  characterId?: string; // キャラ→組織の場合のキャラ
  shift: number;        // 双方向の関係が重ならないよう線をずらす量
};

// 矩形の中心から (dx, dy) 方向に進んだとき、辺（+余白）とぶつかる点
function rectBoundaryPoint(box: NodeCoordInfo, dx: number, dy: number, padding: number) {
  const halfW = box.w / 2 + padding;
  const halfH = box.h / 2 + padding;
  const scale = 1 / Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH);
  return { x: box.x + box.w / 2 + dx * scale, y: box.y + box.h / 2 + dy * scale };
}

// 矩形同士を結ぶ直線とラベル位置。組織の枠は大きいので、枠の辺まで線を引く
function getBoxEdgeGeometry(edge: BoxEdge, coordsMap: Record<string, NodeCoordInfo>) {
  const source = coordsMap[edge.sourceKey];
  const target = coordsMap[edge.targetKey];
  if (!source || !target) return null;

  const sx = source.x + source.w / 2;
  const sy = source.y + source.h / 2;
  // 始点が相手の枠の中にある場合は、枠の見出しに向けて線を引く
  const inside = sx > target.x && sx < target.x + target.w && sy > target.y && sy < target.y + target.h;
  const aimX = target.x + target.w / 2;
  const aimY = inside ? target.y + 24 : target.y + target.h / 2;

  const dx = aimX - sx;
  const dy = aimY - sy;
  const len = Math.hypot(dx, dy);
  if (len < 1) return null;

  // 進行方向に垂直な向き。逆向きの関係では向きが反転するので、同じ shift でも左右に分かれる
  const nx = -dy / len;
  const ny = dx / len;

  const start = rectBoundaryPoint(source, dx, dy, 6);
  const end = inside ? { x: aimX, y: aimY } : rectBoundaryPoint(target, -dx, -dy, 10);
  const x1 = start.x + nx * edge.shift;
  const y1 = start.y + ny * edge.shift;
  const x2 = end.x + nx * edge.shift;
  const y2 = end.y + ny * edge.shift;

  const labelOffset = edge.shift ? 16 : 0;
  return {
    path: `M ${x1} ${y1} L ${x2} ${y2}`,
    labelX: (x1 + x2) / 2 + nx * labelOffset,
    labelY: (y1 + y2) / 2 + ny * labelOffset,
  };
}

export default function RelationsPage() {
  const [loading, setLoading] = useState(true);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [selectedWorldId, setSelectedWorldId] = useState<string>('');

  // 選択された世界観に属するデータ
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [relations, setRelations] = useState<CharacterRelation[]>([]);
  const [orgRelations, setOrgRelations] = useState<OrganizationRelation[]>([]);
  const [charOrgRelations, setCharOrgRelations] = useState<CharacterOrgRelation[]>([]);

  // 配置およびサイズの状態管理
  const [positions, setPositions] = useState<PositionsMap>({});
  const [orgSizes, setOrgSizes] = useState<SizesMap>({});
  const [hoveredCharId, setHoveredCharId] = useState<string | null>(null);
  const [layoutSaveError, setLayoutSaveError] = useState('');

  // キャンバスのパン（スクロール）用のRef
  const viewportRef = useRef<HTMLDivElement>(null);
  const isDraggingCanvas = useRef(false);
  const canvasDragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // リアルタイムの座標情報を保持するRef
  const currentCoordsRef = useRef<Record<string, NodeCoordInfo>>({});

  // ドラッグ＆リサイズ処理用のRef
  const activeDragId = useRef<string | null>(null);
  const activeResizeId = useRef<string | null>(null);
  const dragStartMouse = useRef({ x: 0, y: 0 });
  const dragStartCoords = useRef<Record<string, NodeCoordInfo>>({});

  // 描画フレーム制御用Ref
  const animationFrameId = useRef<number | null>(null);

  // 1. 初期データ（世界観リスト）のロード
  useEffect(() => {
    const fetchInitial = async () => {
      const { data } = await supabase.from('worlds').select('*');
      if (data && data.length > 0) {
        setWorlds(data);
        setSelectedWorldId(data[0].id);
      } else {
        setLoading(false);
      }
    };
    fetchInitial();
  }, []);

  // 2. 世界観選択時の関連データロード
  useEffect(() => {
    if (!selectedWorldId) return;

    const fetchWorldData = async () => {
      setLoading(true);

      const orgsPromise = supabase
        .from('organizations')
        .select('*')
        .eq('world_id', selectedWorldId);

      const charsPromise = supabase
        .from('characters')
        .select(`
          *,
          character_worlds!inner(world_id),
          character_organizations(org_id, relation_name)
        `)
        .eq('character_worlds.world_id', selectedWorldId);

      const layoutPromise = supabase
        .from('relation_layouts')
        .select('positions, org_sizes')
        .eq('world_id', selectedWorldId)
        .maybeSingle();

      const [orgsRes, charsRes, layoutRes] = await Promise.all([orgsPromise, charsPromise, layoutPromise]);

      const loadedOrgs = orgsRes.data || [];
      const loadedChars = (charsRes.data || []).map((c: any) => ({
        ...c,
        character_organizations: c.character_organizations || []
      }));

      const charIds = loadedChars.map(c => c.id);
      const orgIds = loadedOrgs.map(o => o.id);

      const [relsRes, orgRelsRes, charOrgRelsRes] = await Promise.all([
        charIds.length > 0
          ? supabase.from('character_relations').select('*').in('source_character_id', charIds)
          : Promise.resolve({ data: [] }),
        orgIds.length > 0
          ? supabase.from('organization_relations').select('id, source_org_id, target_org_id, relation_name').in('source_org_id', orgIds)
          : Promise.resolve({ data: [] }),
        charIds.length > 0
          ? supabase.from('character_org_relations').select('id, character_id, org_id, relation_name').in('character_id', charIds)
          : Promise.resolve({ data: [] }),
      ]);

      setOrganizations(loadedOrgs);
      setCharacters(loadedChars);
      setRelations(relsRes.data || []);
      setOrgRelations(orgRelsRes.data || []);
      setCharOrgRelations(charOrgRelsRes.data || []);

      initializePositionsAndSizes(loadedOrgs, loadedChars, layoutRes.data);

      setLoading(false);
    };

    fetchWorldData();
  }, [selectedWorldId]);

  // 3. 配置座標とサイズの初期化
  const initializePositionsAndSizes = (
    orgs: Organization[],
    chars: Character[],
    savedLayout: Pick<RelationLayout, 'positions' | 'org_sizes'> | null
  ) => {
    let savedPositions: PositionsMap = savedLayout?.positions ?? {};
    let savedSizes: SizesMap = savedLayout?.org_sizes ?? {};

    // 以前はブラウザ(localStorage)に保存していたため、DBに配置が無ければそちらを引き継ぐ
    let migratedFromBrowser = false;
    if (!savedLayout) {
      try {
        const storedPos = localStorage.getItem(`world_manager_positions_${selectedWorldId}`);
        if (storedPos) {
          savedPositions = JSON.parse(storedPos);
          migratedFromBrowser = true;
        }

        const storedSize = localStorage.getItem(`world_manager_org_sizes_${selectedWorldId}`);
        if (storedSize) {
          savedSizes = JSON.parse(storedSize);
          migratedFromBrowser = true;
        }
      } catch (e) {
        console.error('Failed to load storage data:', e);
      }
    }

    const newPositions: PositionsMap = { ...savedPositions };
    const newSizes: SizesMap = { ...savedSizes };
    let hasChanges = false;

    orgs.forEach((org, idx) => {
      const key = `org-${org.id}`;
      if (!newPositions[key]) {
        newPositions[key] = {
          x: 100 + idx * (DEFAULT_ORG_BOX_WIDTH + 100),
          y: 150
        };
        hasChanges = true;
      }
      if (!newSizes[key]) {
        newSizes[key] = {
          width: DEFAULT_ORG_BOX_WIDTH,
          height: DEFAULT_ORG_BOX_HEIGHT
        };
        hasChanges = true;
      }
    });

    const orgMemberCounts: Record<string, number> = {};

    chars.forEach((char) => {
      const key = `char-${char.id}`;
      if (!newPositions[key]) {
        const firstOrg = char.character_organizations?.[0];

        if (firstOrg) {
          const orgId = firstOrg.org_id;
          const orgKey = `org-${orgId}`;
          const orgPos = newPositions[orgKey] || { x: 100, y: 150 };

          const index = orgMemberCounts[orgId] || 0;
          orgMemberCounts[orgId] = index + 1;

          const col = index % 2;
          const row = Math.floor(index / 2);

          newPositions[key] = {
            x: orgPos.x + 30 + col * (CHAR_CARD_WIDTH + 30),
            y: orgPos.y + 80 + row * (CHAR_CARD_HEIGHT + 35)
          };
        } else {
          const unaffiliatedIdx = chars
            .filter(c => !c.character_organizations || c.character_organizations.length === 0)
            .findIndex(c => c.id === char.id);

          const baseStartX = 100 + orgs.length * (DEFAULT_ORG_BOX_WIDTH + 100);
          const col = unaffiliatedIdx % 3;
          const row = Math.floor(unaffiliatedIdx / 3);

          newPositions[key] = {
            x: baseStartX + col * (CHAR_CARD_WIDTH + 40),
            y: 150 + row * (CHAR_CARD_HEIGHT + 40)
          };
        }
        hasChanges = true;
      }
    });

    setPositions(newPositions);
    setOrgSizes(newSizes);

    const coords: Record<string, NodeCoordInfo> = {};
    Object.keys(newPositions).forEach(k => {
      const isOrg = k.startsWith('org-');
      const pos = newPositions[k];
      const size = isOrg ? newSizes[k] : { width: CHAR_CARD_WIDTH, height: CHAR_CARD_HEIGHT };
      coords[k] = {
        x: pos.x,
        y: pos.y,
        w: size?.width || DEFAULT_ORG_BOX_WIDTH,
        h: size?.height || DEFAULT_ORG_BOX_HEIGHT
      };
    });
    currentCoordsRef.current = coords;

    if (hasChanges || migratedFromBrowser) {
      saveLayout(newPositions, newSizes);
    }
  };

  // 4. 直線矢印 ＆ 上下シフトラベル座標の計算
  const getLinePathAndLabel = (sourceId: string, targetId: string, rel: CharacterRelation, rels: CharacterRelation[], coordsMap: Record<string, NodeCoordInfo>) => {
    const source = coordsMap[`char-${sourceId}`];
    const target = coordsMap[`char-${targetId}`];
    if (!source || !target) return null;

    // カード中心
    const x1 = source.x + source.w / 2;
    const y1 = source.y + source.h / 2;
    const x2 = target.x + target.w / 2;
    const y2 = target.y + target.h / 2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx);

    // 一意の法線ベクトル（法線方向をID順で統一して上下の上下反転を防ぐ）
    const isSourceFirst = sourceId < targetId;
    const baseDx = isSourceFirst ? dx : -dx;
    const baseDy = isSourceFirst ? dy : -dy;
    const baseAngle = Math.atan2(baseDy, baseDx);

    const nx = -Math.sin(baseAngle);
    const ny = Math.cos(baseAngle);

    const isRelFirst = rel.source_character_id < rel.target_character_id;
    const sideSign = isRelFirst ? 1 : -1;

    // 双方向の検出
    const isBi = rels.some(
      r => r.source_character_id === targetId && r.target_character_id === sourceId
    );

    // 平行シフト量（双方向ならオフセットをかけて上下分離、単方向なら0）
    const shift = isBi ? sideSign * 20 : 0;
    const labelOffset = isBi ? sideSign * 18 : 0; // ラベルを線からさらに外側に離す

    const shiftX = nx * shift;
    const shiftY = ny * shift;

    // 端点のオフセット計算（カード外周に矢先を合わせる）
    const padding = 16; // 矢先が見やすい余裕サイズ
    const startX = x1 + Math.cos(angle) * (source.w / 2 + padding) + shiftX;
    const startY = y1 + Math.sin(angle) * (source.h / 2 + padding) + shiftY;
    const endX = x2 + Math.cos(angle + Math.PI) * (target.w / 2 + padding) + shiftX;
    const endY = y2 + Math.sin(angle + Math.PI) * (target.h / 2 + padding) + shiftY;

    // 直線パス（M -> L）
    const path = `M ${startX} ${startY} L ${endX} ${endY}`;

    // 線の中央位置 ＋ 上下ラベル用シフト
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const labelX = midX + nx * labelOffset;
    const labelY = midY + ny * labelOffset;

    return { path, labelX, labelY };
  };

  // 配置をDBに保存する（どのPC・ブラウザで開いても同じ配置になる）
  const saveLayout = async (nextPositions: PositionsMap, nextSizes: SizesMap) => {
    const { error } = await supabase.from('relation_layouts').upsert({
      world_id: selectedWorldId,
      positions: nextPositions,
      org_sizes: nextSizes,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('Failed to save layout:', error);
      setLayoutSaveError(error.message);
    } else {
      setLayoutSaveError('');
    }
  };

  // 組織が関わる線（表示中の組織・キャラの間のものだけ）
  const isShownOrg = (orgId: string) => organizations.some(o => o.id === orgId);
  const isShownChar = (charId: string) => characters.some(c => c.id === charId);
  const boxEdges: BoxEdge[] = [
    ...orgRelations
      .filter(r => isShownOrg(r.source_org_id) && isShownOrg(r.target_org_id))
      .map(r => ({
        id: `orgrel-${r.id}`,
        kind: 'org' as const,
        sourceKey: `org-${r.source_org_id}`,
        targetKey: `org-${r.target_org_id}`,
        label: r.relation_name,
        shift: orgRelations.some(o => o.source_org_id === r.target_org_id && o.target_org_id === r.source_org_id) ? 18 : 0,
      })),
    ...charOrgRelations
      .filter(r => isShownChar(r.character_id) && isShownOrg(r.org_id))
      .map(r => ({
        id: `charorg-${r.id}`,
        kind: 'char-org' as const,
        sourceKey: `char-${r.character_id}`,
        targetKey: `org-${r.org_id}`,
        label: r.relation_name,
        characterId: r.character_id,
        shift: 0,
      })),
  ];

  // ドラッグ中に線とラベルの位置を直接更新する
  const updateBoxEdgeElements = () => {
    boxEdges.forEach(edge => {
      const geo = getBoxEdgeGeometry(edge, currentCoordsRef.current);
      if (!geo) return;
      document.getElementById(`edge-${edge.id}`)?.setAttribute('d', geo.path);
      const labelEl = document.getElementById(`label-${edge.id}`);
      if (labelEl) {
        labelEl.style.left = `${geo.labelX}px`;
        labelEl.style.top = `${geo.labelY}px`;
      }
    });
  };

  // キャラにカーソルを合わせたとき、そのキャラの線だけ目立たせる
  const getBoxEdgeState = (edge: BoxEdge) => {
    if (!hoveredCharId) return { highlighted: false, fadeOut: false };
    const highlighted = edge.characterId === hoveredCharId;
    return { highlighted, fadeOut: !highlighted };
  };

  // 5. ドラッグ＆リサイズ開始処理
  const startDragOrResize = (e: any, id: string, isResize = false) => {
    // リンク・ボタン・入力フォーム・別要素の操作時はドラッグを開始しない
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button') || target.closest('input')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    if (isResize) {
      activeResizeId.current = id;
    } else {
      activeDragId.current = id;
    }

    dragStartMouse.current = { x: e.clientX, y: e.clientY };

    const copy: Record<string, NodeCoordInfo> = {};
    for (const k in currentCoordsRef.current) {
      copy[k] = { ...currentCoordsRef.current[k] };
    }
    dragStartCoords.current = copy;

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
  };

  const handleNodeMouseDown = (e: any, id: string) => startDragOrResize(e, id, false);
  const handleResizeMouseDown = (e: any, id: string) => startDragOrResize(e, id, true);

  // 6. フレーム毎の最適化マウス移動処理
  const handleGlobalMouseMove = (e: any) => {
    const dx = e.clientX - dragStartMouse.current.x;
    const dy = e.clientY - dragStartMouse.current.y;

    if (animationFrameId.current !== null) return;

    animationFrameId.current = requestAnimationFrame(() => {
      animationFrameId.current = null;

      if (activeDragId.current) {
        const dragId = activeDragId.current;
        const startCoord = dragStartCoords.current[dragId];
        if (!startCoord) return;

        if (dragId.startsWith('org-')) {
          const orgId = dragId.replace('org-', '');

          const orgEl = document.getElementById(`org-container-${orgId}`);
          if (orgEl) {
            orgEl.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
          }
          currentCoordsRef.current[dragId].x = startCoord.x + dx;
          currentCoordsRef.current[dragId].y = startCoord.y + dy;

          const orgMembers = characters.filter(c =>
            c.character_organizations?.some(co => co.org_id === orgId)
          );

          orgMembers.forEach(char => {
            const charKey = `char-${char.id}`;
            const charStart = dragStartCoords.current[charKey];
            if (charStart) {
              const charEl = document.getElementById(`char-card-${char.id}`);
              if (charEl) {
                charEl.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
              }
              currentCoordsRef.current[charKey].x = charStart.x + dx;
              currentCoordsRef.current[charKey].y = charStart.y + dy;
            }
          });

        } else {
          const charEl = document.getElementById(`char-card-${dragId.replace('char-', '')}`);
          if (charEl) {
            charEl.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
          }
          currentCoordsRef.current[dragId].x = startCoord.x + dx;
          currentCoordsRef.current[dragId].y = startCoord.y + dy;
        }

        // SVG線・ラベルバッジのリアルタイム更新
        relations.forEach(rel => {
          const line = getLinePathAndLabel(rel.source_character_id, rel.target_character_id, rel, relations, currentCoordsRef.current);
          if (line) {
            const pathEl = document.getElementById(`edge-${rel.id}`);
            if (pathEl) pathEl.setAttribute('d', line.path);

            const glowEl = document.getElementById(`edge-glow-${rel.id}`);
            if (glowEl) glowEl.setAttribute('d', line.path);

            const labelEl = document.getElementById(`label-${rel.id}`);
            if (labelEl) {
              labelEl.style.left = `${line.labelX}px`;
              labelEl.style.top = `${line.labelY}px`;
            }
          }
        });
        updateBoxEdgeElements();

      } else if (activeResizeId.current) {
        const resizeId = activeResizeId.current;
        const startCoord = dragStartCoords.current[resizeId];
        if (!startCoord) return;

        const orgId = resizeId.replace('org-', '');
        const orgEl = document.getElementById(`org-container-${orgId}`);
        if (orgEl) {
          const newW = Math.max(300, startCoord.w + dx);
          const newH = Math.max(200, startCoord.h + dy);

          orgEl.style.width = `${newW}px`;
          orgEl.style.height = `${newH}px`;

          currentCoordsRef.current[resizeId].w = newW;
          currentCoordsRef.current[resizeId].h = newH;
          updateBoxEdgeElements();
        }
      }
    });
  };

  // ドラッグ/リサイズ終了時のState確定
  const handleGlobalMouseUp = () => {
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);

    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }

    const dragId = activeDragId.current;
    const resizeId = activeResizeId.current;

    const nextPositions = { ...positions };
    const nextOrgSizes = { ...orgSizes };

    if (dragId) {
      activeDragId.current = null;

      if (dragId.startsWith('org-')) {
        const orgId = dragId.replace('org-', '');

        const orgEl = document.getElementById(`org-container-${orgId}`);
        if (orgEl) orgEl.style.transform = 'none';

        const finalOrgCoord = currentCoordsRef.current[dragId];
        nextPositions[dragId] = { x: finalOrgCoord.x, y: finalOrgCoord.y };

        const orgMembers = characters.filter(c =>
          c.character_organizations?.some(co => co.org_id === orgId)
        );

        orgMembers.forEach(char => {
          const charKey = `char-${char.id}`;
          const charEl = document.getElementById(`char-card-${char.id}`);
          if (charEl) charEl.style.transform = 'none';

          const finalCharCoord = currentCoordsRef.current[charKey];
          nextPositions[charKey] = { x: finalCharCoord.x, y: finalCharCoord.y };
        });

      } else {
        const charId = dragId.replace('char-', '');
        const charEl = document.getElementById(`char-card-${charId}`);
        if (charEl) charEl.style.transform = 'none';

        const finalCoord = currentCoordsRef.current[dragId];
        nextPositions[dragId] = { x: finalCoord.x, y: finalCoord.y };
      }

      setPositions(nextPositions);
      saveLayout(nextPositions, orgSizes);

    } else if (resizeId) {
      activeResizeId.current = null;

      const finalCoord = currentCoordsRef.current[resizeId];
      nextOrgSizes[resizeId] = { width: finalCoord.w, height: finalCoord.h };

      setOrgSizes(nextOrgSizes);
      saveLayout(positions, nextOrgSizes);
    }
  };

  // キャンバスのパン操作
  const handleCanvasMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && !(e.target as HTMLElement).classList.contains('canvas-bg')) {
      return;
    }
    e.preventDefault();
    isDraggingCanvas.current = true;
    canvasDragStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: viewportRef.current?.scrollLeft || 0,
      scrollTop: viewportRef.current?.scrollTop || 0
    };
  };

  const handleCanvasMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isDraggingCanvas.current || !viewportRef.current) return;
    const dx = e.clientX - canvasDragStart.current.x;
    const dy = e.clientY - canvasDragStart.current.y;
    viewportRef.current.scrollLeft = canvasDragStart.current.scrollLeft - dx;
    viewportRef.current.scrollTop = canvasDragStart.current.scrollTop - dy;
  };

  const handleCanvasMouseUp = () => {
    isDraggingCanvas.current = false;
  };

  // ホバー判定
  const isRelated = (charId: string) => {
    if (!hoveredCharId) return true;
    if (charId === hoveredCharId) return true;
    return relations.some(
      r =>
        (r.source_character_id === hoveredCharId && r.target_character_id === charId) ||
        (r.target_character_id === hoveredCharId && r.source_character_id === charId)
    );
  };

  const isEdgeHighlighted = (sourceId: string, targetId: string) => {
    if (!hoveredCharId) return false;
    return (
      (sourceId === hoveredCharId && isRelated(targetId)) ||
      (targetId === hoveredCharId && isRelated(sourceId))
    );
  };

  const getCanvasSize = () => {
    let maxX = 2500;
    let maxY = 1500;

    Object.values(positions).forEach(pos => {
      if (pos.x + 800 > maxX) maxX = pos.x + 800;
      if (pos.y + 600 > maxY) maxY = pos.y + 600;
    });

    return { width: `${maxX}px`, height: `${maxY}px` };
  };

  const canvasSize = getCanvasSize();

  const boxEdgeGeometries = new Map(boxEdges.map(edge => [edge.id, getBoxEdgeGeometry(edge, currentCoordsRef.current)]));

  if (loading && worlds.length === 0) {
    return (
      <div className="p-20 text-center font-bold text-indigo-400 animate-pulse">
        フリーボード相関図を初期化中...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <header className="flex flex-wrap justify-between items-end gap-6">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">Relations_Map</h1>
          <p className="text-slate-500 text-xs mt-2 font-bold uppercase tracking-widest">
            掴んで移動＆リサイズできる、直線矢印対応の相関図ボード
          </p>
        </div>

        <div className="flex gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-800 z-50">
          {worlds.map(w => (
            <button
              key={w.id}
              onClick={() => setSelectedWorldId(w.id)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-colors uppercase tracking-wide ${selectedWorldId === w.id
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
            >
              {w.name}
            </button>
          ))}
        </div>
      </header>

      {layoutSaveError && (
        <p role="alert" className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-2xl p-3">
          配置の保存に失敗しました: {layoutSaveError}
        </p>
      )}

      <div
        ref={viewportRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        className="w-full h-[780px] border border-slate-800/80 rounded-[3rem] overflow-auto cursor-grab active:cursor-grabbing bg-slate-950/40 backdrop-blur-md relative select-none scrollbar-thin scrollbar-thumb-slate-800"
      >
        <div
          className="canvas-bg relative"
          style={{ width: canvasSize.width, height: canvasSize.height }}
        >
          <div className="canvas-bg absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-10" />

          {/* 1. 背面のSVG関係線レイヤー */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <defs>
              {/* くっきり大きく表示される矢印マーカー */}
              <marker
                id="arrow"
                viewBox="0 0 12 12"
                refX="10"
                refY="6"
                markerWidth="10"
                markerHeight="10"
                orient="auto-start-reverse"
              >
                <path d="M 1 1 L 11 6 L 1 11 Z" fill="#6366f1" />
              </marker>
              <marker
                id="arrow-highlight"
                viewBox="0 0 12 12"
                refX="10"
                refY="6"
                markerWidth="12"
                markerHeight="12"
                orient="auto-start-reverse"
              >
                <path d="M 1 1 L 11 6 L 1 11 Z" fill="#a855f7" />
              </marker>
              <marker id="arrow-org" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
                <path d="M 1 1 L 11 6 L 1 11 Z" fill="#f59e0b" />
              </marker>
              <marker id="arrow-charorg" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="10" markerHeight="10" orient="auto-start-reverse">
                <path d="M 1 1 L 11 6 L 1 11 Z" fill="#f43f5e" />
              </marker>
              <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>

            {relations.map(rel => {
              const line = getLinePathAndLabel(
                rel.source_character_id,
                rel.target_character_id,
                rel,
                relations,
                currentCoordsRef.current
              );
              if (!line) return null;

              const highlighted = isEdgeHighlighted(rel.source_character_id, rel.target_character_id);
              const fadeOut = hoveredCharId && !highlighted;

              return (
                <g key={rel.id}>
                  <path
                    id={`edge-glow-${rel.id}`}
                    d={line.path}
                    fill="none"
                    stroke={highlighted ? "url(#edge-gradient)" : "transparent"}
                    strokeWidth={highlighted ? 8 : 0}
                    opacity={highlighted ? 0.35 : 0}
                    className="blur-sm"
                  />
                  <path
                    id={`edge-${rel.id}`}
                    d={line.path}
                    fill="none"
                    stroke={highlighted ? "url(#edge-gradient)" : "#6366f1"}
                    strokeWidth={highlighted ? 3 : 2}
                    opacity={fadeOut ? 0.08 : highlighted ? 1 : 0.6}
                    markerEnd={highlighted ? "url(#arrow-highlight)" : "url(#arrow)"}
                    strokeDasharray={highlighted ? "8, 4" : "none"}
                    className={highlighted ? "animate-[dash_20s_linear_infinite]" : ""}
                    style={{
                      strokeDashoffset: highlighted ? 100 : 0
                    }}
                  />
                </g>
              );
            })}

            {/* 組織→組織（橙）、キャラ→組織（赤の点線） */}
            {boxEdges.map(edge => {
              const geo = boxEdgeGeometries.get(edge.id);
              if (!geo) return null;
              const { highlighted, fadeOut } = getBoxEdgeState(edge);
              const isOrgEdge = edge.kind === 'org';
              return (
                <path
                  key={edge.id}
                  id={`edge-${edge.id}`}
                  d={geo.path}
                  fill="none"
                  stroke={isOrgEdge ? '#f59e0b' : '#f43f5e'}
                  strokeWidth={highlighted ? 3 : isOrgEdge ? 2.5 : 2}
                  strokeDasharray={isOrgEdge ? 'none' : '6, 4'}
                  opacity={fadeOut ? 0.08 : highlighted ? 1 : 0.7}
                  markerEnd={isOrgEdge ? 'url(#arrow-org)' : 'url(#arrow-charorg)'}
                />
              );
            })}
          </svg>

          {/* 2. 関係性バッジの配置 */}
          <div className="absolute inset-0 pointer-events-none z-20">
            {relations.map(rel => {
              const line = getLinePathAndLabel(
                rel.source_character_id,
                rel.target_character_id,
                rel,
                relations,
                currentCoordsRef.current
              );
              if (!line) return null;

              const highlighted = isEdgeHighlighted(rel.source_character_id, rel.target_character_id);
              const fadeOut = hoveredCharId && !highlighted;

              return (
                <div
                  key={`label-${rel.id}`}
                  id={`label-${rel.id}`}
                  className="absolute pointer-events-auto"
                  style={{
                    left: `${line.labelX}px`,
                    top: `${line.labelY}px`,
                    transform: 'translate(-50%, -50%)',
                    opacity: fadeOut ? 0.08 : 1,
                    scale: highlighted ? '1.05' : '1'
                  }}
                >
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-lg backdrop-blur-md ${highlighted
                    ? 'bg-indigo-900/90 text-indigo-200 border-indigo-400'
                    : 'bg-slate-900/90 text-slate-300 border-slate-700'
                    }`}>
                    {rel.relation_name}
                  </span>
                </div>
              );
            })}

            {boxEdges.map(edge => {
              const geo = boxEdgeGeometries.get(edge.id);
              if (!geo) return null;
              const { highlighted, fadeOut } = getBoxEdgeState(edge);
              return (
                <div
                  key={`label-${edge.id}`}
                  id={`label-${edge.id}`}
                  className="absolute pointer-events-auto"
                  style={{
                    left: `${geo.labelX}px`,
                    top: `${geo.labelY}px`,
                    transform: 'translate(-50%, -50%)',
                    opacity: fadeOut ? 0.08 : 1,
                    scale: highlighted ? '1.05' : '1'
                  }}
                >
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-lg backdrop-blur-md ${edge.kind === 'org'
                    ? 'bg-amber-950/90 text-amber-200 border-amber-500/60'
                    : 'bg-rose-950/90 text-rose-200 border-rose-500/60'
                    }`}>
                    {edge.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 3. 組織コンテナ（枠全域ドラッグ可能） */}
          {organizations.map(org => {
            const pos = positions[`org-${org.id}`] || { x: 100, y: 150 };
            const size = orgSizes[`org-${org.id}`] || { width: DEFAULT_ORG_BOX_WIDTH, height: DEFAULT_ORG_BOX_HEIGHT };

            const orgMembers = characters.filter(c =>
              c.character_organizations?.some(co => co.org_id === org.id)
            );

            const hasHoveredMember = hoveredCharId && orgMembers.some(m => m.id === hoveredCharId);
            const isOrgRelated = hoveredCharId && orgMembers.some(m => isRelated(m.id));
            // カーソルを合わせたキャラが、所属以外の関係を持っている組織
            const isFeelingTarget = hoveredCharId && charOrgRelations.some(r => r.character_id === hoveredCharId && r.org_id === org.id);
            const fadeOut = hoveredCharId && !hasHoveredMember && !isOrgRelated && !isFeelingTarget;

            return (
              <div
                key={org.id}
                id={`org-container-${org.id}`}
                onMouseDown={(e) => handleNodeMouseDown(e, `org-${org.id}`)}
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${size.width}px`,
                  height: `${size.height}px`,
                  opacity: fadeOut ? 0.25 : 1
                }}
                className={`bg-slate-900/10 border rounded-[2.5rem] p-6 backdrop-blur-sm z-10 cursor-grab active:cursor-grabbing will-change-transform ${hasHoveredMember
                  ? 'border-emerald-500 bg-emerald-500/5 shadow-lg shadow-emerald-500/5'
                  : isFeelingTarget
                    ? 'border-rose-500/60 bg-rose-500/5'
                    : isOrgRelated
                      ? 'border-purple-500/40 bg-purple-500/5'
                      : 'border-slate-800/80 hover:border-slate-700/50'
                  }`}
              >
                <header className="flex justify-between items-center border-b border-slate-800/60 pb-3 mb-4 select-none pointer-events-none">
                  <div className="flex flex-col">
                    <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase font-black tracking-widest w-fit">
                      ORGANIZATION
                    </span>
                    <h3 className="text-base font-bold text-white mt-1 truncate max-w-[280px]">{org.name}</h3>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {orgMembers.length} メンバー
                  </span>
                </header>

                {/* 📐 リサイズハンドル (右下) */}
                <div
                  onMouseDown={(e) => handleResizeMouseDown(e, `org-${org.id}`)}
                  className="absolute right-3.5 bottom-3.5 w-6 h-6 cursor-se-resize flex items-end justify-end pointer-events-auto group z-20"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" className="text-slate-600 group-hover:text-emerald-400 transition-colors">
                    <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    <line x1="8" y1="5" x2="5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            );
          })}

          {/* 4. キャラクターカードの配置 */}
          {characters.map(char => {
            const pos = positions[`char-${char.id}`] || { x: 150, y: 150 };
            const primaryOrgCo = char.character_organizations?.[0];
            const org = primaryOrgCo ? organizations.find(o => o.id === primaryOrgCo.org_id) : null;

            const isCharRelated = isRelated(char.id);
            const fadeOut = hoveredCharId && !isCharRelated;
            const isMainHovered = hoveredCharId === char.id;

            return (
              <div
                key={char.id}
                id={`char-card-${char.id}`}
                onMouseEnter={() => setHoveredCharId(char.id)}
                onMouseLeave={() => setHoveredCharId(null)}
                onMouseDown={(e) => handleNodeMouseDown(e, `char-${char.id}`)}
                style={{
                  position: 'absolute',
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${CHAR_CARD_WIDTH}px`,
                  height: `${CHAR_CARD_HEIGHT}px`,
                  opacity: fadeOut ? 0.15 : 1
                }}
                className={`bg-slate-950 border p-4 rounded-3xl flex flex-col justify-between cursor-grab active:cursor-grabbing z-30 will-change-transform ${isMainHovered
                  ? 'border-indigo-500 shadow-xl shadow-indigo-500/30 scale-[1.04] z-40'
                  : isCharRelated && hoveredCharId
                    ? 'border-purple-500/80 shadow-lg shadow-purple-500/20 scale-[1.02] z-40'
                    : 'border-slate-800/80 hover:border-slate-700'
                  }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-sm font-bold text-white truncate">{char.name}</h4>
                    <span className="text-[8px] text-slate-500 font-mono uppercase bg-slate-900 px-1.5 py-0.5 rounded">
                      {char.gender}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {org && (
                      <span className="text-[8px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded truncate max-w-[210px]">
                        {org.name} {primaryOrgCo?.relation_name ? `: ${primaryOrgCo.relation_name}` : ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-end border-t border-slate-900 pt-2 select-none">
                  <span className="text-[8px] text-slate-600 font-mono">ID: {char.id.substring(0, 5)}</span>
                  <Link
                    href={`/edit/${char.id}`}
                    className="text-[8px] font-bold text-indigo-400 hover:text-white transition-colors"
                  >
                    設定編集
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl text-slate-400 text-xs space-y-2 text-white">
        <p className="font-bold text-white">💡 操作ガイド</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>⚡ ぬるぬるドラッグ</strong>: カード（または組織枠の全域）を掴んで動かすと、直線矢印が滑らかに追従します。</li>
          <li><strong>📐 組織枠のリサイズ</strong>: 組織コンテナの右下隅にある三角マークをドラッグしてリサイズできます。</li>
          <li><strong>👥 組織のグループ移動</strong>: 組織枠の空きスペースを掴んで動かすと、所属メンバーごと一括移動できます。</li>
          <li><strong>🏹 直線矢印＆上下配置</strong>: 矢印がまっすぐ伸びるようになり、対向関係（A↔B）は上下平行に分離して読みやすく整理されます。</li>
          <li><strong>🎨 矢印の色</strong>: <span className="text-indigo-400">紫</span>＝キャラ同士、<span className="text-amber-400">橙</span>＝組織同士、<span className="text-rose-400">赤の点線</span>＝キャラから組織（所属以外の感情・関わり）。</li>
          <li><strong>💾 配置の保存</strong>: 動かした配置や組織枠の大きさはアカウントに保存され、別のPCやブラウザで開いても同じ配置になります。</li>
        </ul>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
      `}} />
    </div>
  );
}