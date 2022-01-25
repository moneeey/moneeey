const parseBool = (value: any, defaultValue = false) => ['true', 'false', true, false].includes(value) && JSON.parse(value) || defaultValue

export default parseBool
