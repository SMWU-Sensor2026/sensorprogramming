from enum import StrEnum


class CabinetMode(StrEnum):
    HOME = 'HOME'
    PUBLIC = 'PUBLIC'


class SessionStatus(StrEnum):
    RESERVED = 'RESERVED'
    ACTIVE = 'ACTIVE'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'
    EXPIRED = 'EXPIRED'


class ShoeStatus(StrEnum):
    EMPTY = 'EMPTY'
    OCCUPIED = 'OCCUPIED'
    UNKNOWN = 'UNKNOWN'


class DoorStatus(StrEnum):
    OPEN = 'OPEN'
    CLOSED = 'CLOSED'
    MOVING = 'MOVING'
    ERROR = 'ERROR'


class DryingStatus(StrEnum):
    IDLE = 'IDLE'
    DRYING = 'DRYING'
    COMPLETED = 'COMPLETED'
    ERROR = 'ERROR'


class FanStatus(StrEnum):
    OFF = 'OFF'
    ON = 'ON'


class CompartmentAvailability(StrEnum):
    AVAILABLE = 'AVAILABLE'
    RESERVED = 'RESERVED'
    IN_USE = 'IN_USE'
    UNAVAILABLE = 'UNAVAILABLE'


class UserRole(StrEnum):
    USER = 'USER'
    ADMIN = 'ADMIN'


class AuthType(StrEnum):
    ACCOUNT = 'ACCOUNT'
    GUEST_TOKEN = 'GUEST_TOKEN'


class EventType(StrEnum):
    SHOE_IN = 'SHOE_IN'
    SHOE_OUT = 'SHOE_OUT'
    DRY_START = 'DRY_START'
    DRY_COMPLETE = 'DRY_COMPLETE'
    DRY_ERROR = 'DRY_ERROR'
    UNEXPECTED_REMOVAL = 'UNEXPECTED_REMOVAL'


class SystemStatus(StrEnum):
    NORMAL = 'NORMAL'
    DEGRADED = 'DEGRADED'
    ERROR = 'ERROR'
    OFFLINE = 'OFFLINE'
