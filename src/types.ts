export interface RadioStation {
  changeuuid: string;
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  state: string;
  language: string;
  votes: number;
  codec: string;
  countrycode?: string;
  bitrate: number;
  hls: number;
  lastcheckok: number;
  clickcount: number;
}

export type ViewType = "countries" | "favorites" | "search" | "genres" | "stations" | "popular";

export interface Country {
  name: string;
  iso_3166_1: string;
  stationcount: number;
}
