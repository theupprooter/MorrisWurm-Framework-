export interface Target {
  ip: string;
  ports: number[];
}

export interface ErrorLog {
  type: string;
  details: string;
  targetIp: string;
}
