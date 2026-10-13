// Release builds run Android lint, which runs out of Metaspace with the default Gradle JVM
// settings, and native code for four ABIs at once can exhaust memory on a laptop.
// Give the Gradle daemon more room, fewer parallel workers, and only the ABIs real phones use.
const { withGradleProperties } = require('expo/config-plugins')

const JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1536m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8'

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (cfg) => {
    const set = {
      'org.gradle.jvmargs': JVM_ARGS,
      'org.gradle.workers.max': '4',
      reactNativeArchitectures: 'armeabi-v7a,arm64-v8a',
    }
    cfg.modResults = cfg.modResults.filter((item) => !(item.type === 'property' && item.key in set))
    for (const [key, value] of Object.entries(set)) cfg.modResults.push({ type: 'property', key, value })
    return cfg
  })
}
