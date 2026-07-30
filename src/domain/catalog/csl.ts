export type CslClub = {
  readonly city: string;
  readonly id: string;
  readonly name: string;
  readonly shortName: string;
  readonly strength: 1 | 2 | 3 | 4 | 5;
};

export const CSL_CATALOG_VERSION = "csl-2025" as const;

export const CSL_CLUBS = [
  {
    city: "上海",
    id: "shanghai-port",
    name: "上海海港",
    shortName: "海港",
    strength: 5,
  },
  {
    city: "上海",
    id: "shanghai-shenhua",
    name: "上海申花",
    shortName: "申花",
    strength: 5,
  },
  {
    city: "成都",
    id: "chengdu-rongcheng",
    name: "成都蓉城",
    shortName: "蓉城",
    strength: 5,
  },
  {
    city: "北京",
    id: "beijing-guoan",
    name: "北京国安",
    shortName: "国安",
    strength: 5,
  },
  {
    city: "济南",
    id: "shandong-taishan",
    name: "山东泰山",
    shortName: "泰山",
    strength: 5,
  },
  {
    city: "天津",
    id: "tianjin-jinmen-tiger",
    name: "天津津门虎",
    shortName: "津门虎",
    strength: 4,
  },
  {
    city: "杭州",
    id: "zhejiang",
    name: "浙江",
    shortName: "浙江",
    strength: 4,
  },
  {
    city: "郑州",
    id: "henan",
    name: "河南",
    shortName: "河南",
    strength: 3,
  },
  {
    city: "长春",
    id: "changchun-yatai",
    name: "长春亚泰",
    shortName: "亚泰",
    strength: 2,
  },
  {
    city: "青岛",
    id: "qingdao-west-coast",
    name: "青岛西海岸",
    shortName: "西海岸",
    strength: 3,
  },
  {
    city: "武汉",
    id: "wuhan-three-towns",
    name: "武汉三镇",
    shortName: "三镇",
    strength: 3,
  },
  {
    city: "青岛",
    id: "qingdao-hainiu",
    name: "青岛海牛",
    shortName: "海牛",
    strength: 2,
  },
  {
    city: "深圳",
    id: "shenzhen-peng-city",
    name: "深圳新鹏城",
    shortName: "新鹏城",
    strength: 2,
  },
  {
    city: "玉溪",
    id: "yunnan-yukun",
    name: "云南玉昆",
    shortName: "玉昆",
    strength: 3,
  },
  {
    city: "大连",
    id: "dalian-yingbo",
    name: "大连英博",
    shortName: "英博",
    strength: 3,
  },
  {
    city: "梅州",
    id: "meizhou-hakka",
    name: "梅州客家",
    shortName: "客家",
    strength: 2,
  },
] as const satisfies readonly CslClub[];

export type CslClubId = (typeof CSL_CLUBS)[number]["id"];

export function getCslClub(id: string): CslClub | undefined {
  return CSL_CLUBS.find((club) => club.id === id);
}
