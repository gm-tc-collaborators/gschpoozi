"""
templates.py - Jinja2 template loading and rendering

Handles loading config-sections.yaml and rendering templates.
"""

import yaml
from pathlib import Path
from typing import Any, Dict, Optional
from jinja2 import Environment, BaseLoader, TemplateSyntaxError


class TemplateRenderer:
    """Renders Klipper config from Jinja2 templates."""
    
    def __init__(self, templates_file: Path = None):
        self.templates_file = templates_file or self._find_templates_file()
        self.templates: Dict[str, Any] = {}
        self.pin_config: Dict[str, str] = {}
        self._load_templates()
        
        # Set up Jinja2 environment
        self.env = Environment(
            loader=BaseLoader(),
            trim_blocks=True,
            lstrip_blocks=True,
        )
        
        # Add custom filters
        self.env.filters['abs'] = abs
    
    def _find_templates_file(self) -> Path:
        """Find config-sections.yaml in the schema directory."""
        # Try relative to this file
        module_dir = Path(__file__).parent
        candidates = [
            module_dir.parent.parent / "schema" / "config-sections.yaml",
            module_dir.parent / "schema" / "config-sections.yaml",
            Path.home() / "gschpoozi" / "schema" / "config-sections.yaml",
        ]
        
        for path in candidates:
            if path.exists():
                return path
        
        raise FileNotFoundError(
            "Could not find config-sections.yaml. "
            "Searched: " + ", ".join(str(p) for p in candidates)
        )
    
    def _load_templates(self) -> None:
        """Load templates from YAML file."""
        with open(self.templates_file, 'r') as f:
            data = yaml.safe_load(f)
        
        self.templates = data
        self.pin_config = data.get('pin_config', {})
    
    def evaluate_condition(self, condition: str, context: Dict[str, Any]) -> bool:
        """Evaluate a condition string against context."""
        if not condition:
            return True
        
        try:
            # Simple evaluation - convert dot notation to dict access
            # This is a simplified evaluator, not a full expression parser
            return eval(condition, {"__builtins__": {}}, context)
        except Exception:
            # If condition evaluation fails, default to True
            return True
    
    def render_template(
        self,
        template_str: str,
        context: Dict[str, Any]
    ) -> str:
        """Render a single template string with context."""
        try:
            # Add pin_config to context
            context['pin_config'] = self.pin_config
            
            template = self.env.from_string(template_str)
            return template.render(**context)
        except TemplateSyntaxError as e:
            return f"# Template error: {e}\n"
        except Exception as e:
            return f"# Render error: {e}\n"
    
    def render_section(
        self,
        section_name: str,
        context: Dict[str, Any],
        subsection: str = None
    ) -> Optional[str]:
        """
        Render a config section.
        
        Args:
            section_name: Top-level section (e.g., 'mcu', 'stepper_x')
            context: Wizard state data
            subsection: Optional subsection (e.g., 'main' for mcu.main)
        
        Returns:
            Rendered config string or None if condition not met
        """
        section = self.templates.get(section_name)
        if not section:
            return None
        
        if subsection:
            section = section.get(subsection)
            if not section:
                return None
        
        # Check condition
        condition = section.get('condition')
        if condition and not self.evaluate_condition(condition, context):
            return None
        
        # Get template
        template_str = section.get('template')
        if not template_str:
            return None
        
        return self.render_template(template_str, context)
    
    def render_all(self, context: Dict[str, Any]) -> Dict[str, str]:
        """
        Render all sections that apply to the given context.
        
        Returns:
            Dict mapping section names to rendered config strings
        """
        results = {}
        
        # Define section order for output
        section_order = [
            ('mcu', 'main'),
            ('mcu', 'toolboard'),
            ('mcu', 'host'),
            ('printer', None),
            ('stepper_x', None),
            ('tmc_stepper_x', None),
            ('stepper_y', None),
            ('tmc_stepper_y', None),
            ('stepper_z', None),
            ('tmc_stepper_z', None),
            ('extruder', None),
            ('heater_bed', None),
            ('fan', None),
            ('heater_fan', None),
            ('controller_fan', None),
            ('probe', None),
            ('bltouch', None),
            ('safe_z_home', None),
            ('bed_mesh', None),
            ('z_tilt', None),
            ('quad_gantry_level', None),
        ]
        
        for section_name, subsection in section_order:
            key = f"{section_name}.{subsection}" if subsection else section_name
            result = self.render_section(section_name, context, subsection)
            if result:
                results[key] = result
        
        # Render common sections
        common = self.templates.get('common', {})
        for name, section in common.items():
            condition = section.get('condition')
            if condition and not self.evaluate_condition(condition, context):
                continue
            
            template_str = section.get('template')
            if template_str:
                result = self.render_template(template_str, context)
                if result:
                    results[f"common.{name}"] = result
        
        return results

