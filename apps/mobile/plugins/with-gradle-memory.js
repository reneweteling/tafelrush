// Release builds run Android lint, which runs out of Metaspace with the default Gradle JVM
// settings. Give the Gradle daemon more room.
const { withGradleProperties } = require('expo/config-plugins')

const JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1536m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8'

module.exports = function withGradleMemory(config) {
  return withGradleProperties(config, (cfg) => {
    cfg.modResults = cfg.modResults.filter((item) => !(item.type === 'property' && item.key === 'org.gradle.jvmargs'))
    cfg.modResults.push({ type: 'property', key: 'org.gradle.jvmargs', value: JVM_ARGS })
    return cfg
  })
}
