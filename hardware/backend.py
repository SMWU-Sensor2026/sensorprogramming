"""A small driver contract; GPIO code never belongs in Flask routes."""
import importlib.util
import sys
from pathlib import Path


class MockDriver:
    is_mock = True

    def read_compartment(self, compartment_id):
        return {}  # retain the simulated, persisted observations

    def read_external_environment(self):
        return {'temperature': None, 'humidity': None, 'is_valid': False}

    def open_door(self, compartment_id):
        return True

    def close_door(self, compartment_id):
        return True

    def set_fans(self, compartment_id, circulation_on, exhaust_on):
        return True


def load_driver():
    path = Path(__file__).with_name('team_driver.py')
    if not path.exists():
        return MockDriver()
    spec = importlib.util.spec_from_file_location('bbosong_team_driver', path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    driver = module.create_driver()
    for name in ('read_compartment', 'read_external_environment', 'open_door', 'close_door', 'set_fans'):
        if not callable(getattr(driver, name, None)):
            raise TypeError(f'team_driver.create_driver() must return a driver with {name}()')
    if getattr(driver, 'is_mock', None) is not False:
        raise TypeError('Team hardware driver must declare is_mock = False')
    return driver
