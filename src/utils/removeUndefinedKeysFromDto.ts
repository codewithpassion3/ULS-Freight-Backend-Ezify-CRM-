export const remvoeUndefinedKeysFromDto = (obj: Record<string, any>) => {
  //Filter out any undefined key value pairs from the dto
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
}