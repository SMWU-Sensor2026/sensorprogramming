"""Copy to team_driver.py, fill in the five methods, then restart Flask.

Import existing team sensor/motor modules inside this file. No web changes needed.
Read methods return actual observed states. Command True means accepted, NOT that
physical motion completed. The next read_compartment() confirms the actual door.
"""


class TeamDriver:
    is_mock = False

    def read_compartment(self, compartment_id):
        # Replace with measured values; use UNKNOWN/None for unavailable sensors.
        # Never return OPEN merely because open_door() issued a servo command.
        raise NotImplementedError('Connect HC-SR04, DHT22 and physical door feedback here')
        # return {'shoe_status': 'OCCUPIED', 'door_status': 'CLOSED',
        #         'temperature': 24.0, 'humidity': 65.0,
        #         'circulation_fan_status': 'ON', 'exhaust_fan_status': 'ON'}

    def read_external_environment(self):
        return {'temperature': None, 'humidity': None, 'is_valid': False}

    def open_door(self, compartment_id):
        raise NotImplementedError('Call your servo open function; return True if accepted')

    def close_door(self, compartment_id):
        raise NotImplementedError('Call your servo close function; return True if accepted')

    def set_fans(self, compartment_id, circulation_on, exhaust_on):
        raise NotImplementedError('Call your MOSFET/fan functions; return True if accepted')


def create_driver():
    return TeamDriver()
