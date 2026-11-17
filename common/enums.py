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
    DRY_STOP = 'DRY_STOP'
    DOOR_ERROR = 'DOOR_ERROR'
    UNEXPECTED_REMOVAL = 'UNEXPECTED_REMOVAL'


class SystemStatus(StrEnum):
    NORMAL = 'NORMAL'
    DEGRADED = 'DEGRADED'
    ERROR = 'ERROR'
    OFFLINE = 'OFFLINE'


class ShoeStatus(str, Enum):
    EMPTY = "EMPTY"
    OCCUPIED = "OCCUPIED"
    UNKNOWN = "UNKNOWN"

class DryingStatus(str, Enum):
    IDLE = "IDLE"
    DRYING = "DRYING"
    COMPLETED = "COMPLETED"
    ERROR = "ERROR"

class FanStatus(str, Enum):
    OFF = "OFF"
    ON = "ON"

class DoorStatus(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    MOVING = "MOVING"
    ERROR = "ERROR"

class CabinetMode(str, Enum):
    HOME = "HOME"
    PUBLIC = "PUBLIC"

class SessionStatus(str, Enum):
    RESERVED = "RESERVED"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"

class CompartmentAvailability(str, Enum):
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    IN_USE = "IN_USE"
    UNAVAILABLE = "UNAVAILABLE"

class UserRole(str, Enum):
    USER = "USER"
    ADMIN = "ADMIN"

class AuthType(str, Enum):
    ACCOUNT = "ACCOUNT"
    GUEST_TOKEN = "GUEST_TOKEN"

class SystemStatus(str, Enum):
    NORMAL = "NORMAL"
    DEGRADED = "DEGRADED"
    ERROR = "ERROR"
    OFFLINE = "OFFLINE"

class EventType(str, Enum):
    SHOE_IN = "SHOE_IN"
    SHOE_OUT = "SHOE_OUT"
    DRY_START = "DRY_START"
    DRY_COMPLETE = "DRY_COMPLETE"
    DRY_ERROR = "DRY_ERROR"
    UNEXPECTED_REMOVAL = "UNEXPECTED_REMOVAL"
    SESSION_CREATED = "SESSION_CREATED"
    SESSION_COMPLETED = "SESSION_COMPLETED"
    DOOR_OPENED = "DOOR_OPENED"
    DOOR_CLOSED = "DOOR_CLOSED"
    UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS"
    REMOVAL_AUTHORIZED = "REMOVAL_AUTHORIZED"

