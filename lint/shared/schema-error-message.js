function indentLines(string) {
  const regex = /^(?!\s*$)/gm;
  return string.replace(regex, '|  ');
}

export default function (error) {
  const debugInstance = JSON.stringify(error.instance, null, 2);
  const indentedInstance = indentLines(debugInstance);

  return `❌ ${error.stack}. Fix the bad value below:\n${indentedInstance}`
}