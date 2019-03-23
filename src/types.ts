export interface MessageDescriptor {
    id?: string
    description?: string
    defaultMessage: string
}

export interface Messages {
    [key: string]: MessageDescriptor
}
