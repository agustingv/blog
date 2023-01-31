<?php

use Twig\Environment;
use Twig\Error\LoaderError;
use Twig\Error\RuntimeError;
use Twig\Extension\SandboxExtension;
use Twig\Markup;
use Twig\Sandbox\SecurityError;
use Twig\Sandbox\SecurityNotAllowedTagError;
use Twig\Sandbox\SecurityNotAllowedFilterError;
use Twig\Sandbox\SecurityNotAllowedFunctionError;
use Twig\Source;
use Twig\Template;

/* themes/contrib/bootstrap5/templates/admin/system-themes-page.html.twig */
class __TwigTemplate_cbeadd135f247ab020a0d18149d2c3c3 extends Template
{
    private $source;
    private $macros = [];

    public function __construct(Environment $env)
    {
        parent::__construct($env);

        $this->source = $this->getSourceContext();

        $this->parent = false;

        $this->blocks = [
        ];
        $this->sandbox = $this->env->getExtension('\Twig\Extension\SandboxExtension');
        $this->checkSecurity();
    }

    protected function doDisplay(array $context, array $blocks = [])
    {
        $macros = $this->macros;
        // line 32
        echo "<div";
        echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(($context["attributes"] ?? null), 32, $this->source), "html", null, true);
        echo ">
  ";
        // line 33
        $context['_parent'] = $context;
        $context['_seq'] = twig_ensure_traversable(($context["theme_groups"] ?? null));
        foreach ($context['_seq'] as $context["_key"] => $context["theme_group"]) {
            // line 34
            echo "    ";
            // line 35
            $context["theme_group_classes"] = [0 => "system-themes-list", 1 => ("system-themes-list-" . $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source,             // line 37
$context["theme_group"], "state", [], "any", false, false, true, 37), 37, $this->source)), 2 => "row g-3"];
            // line 41
            echo "    <h2 class=\"system-themes-list__header m-3\">";
            echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, $context["theme_group"], "title", [], "any", false, false, true, 41), 41, $this->source), "html", null, true);
            echo "</h2>
    <div";
            // line 42
            echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, twig_get_attribute($this->env, $this->source, $context["theme_group"], "attributes", [], "any", false, false, true, 42), "addClass", [0 => ($context["theme_group_classes"] ?? null)], "method", false, false, true, 42), 42, $this->source), "html", null, true);
            echo ">
      ";
            // line 43
            $context['_parent'] = $context;
            $context['_seq'] = twig_ensure_traversable(twig_get_attribute($this->env, $this->source, $context["theme_group"], "themes", [], "any", false, false, true, 43));
            foreach ($context['_seq'] as $context["_key"] => $context["theme"]) {
                // line 44
                echo "        ";
                // line 45
                $context["theme_classes"] = [0 => ((twig_get_attribute($this->env, $this->source,                 // line 46
$context["theme"], "is_default", [], "any", false, false, true, 46)) ? ("theme-default") : ("")), 1 => ((twig_get_attribute($this->env, $this->source,                 // line 47
$context["theme"], "is_admin", [], "any", false, false, true, 47)) ? ("theme-admin") : ("")), 2 => (((twig_get_attribute($this->env, $this->source,                 // line 48
$context["theme_group"], "state", [], "any", false, false, true, 48) == "installed")) ? ("col-12 col-md-3") : ("col-12 col-md-2"))];
                // line 51
                echo "        <div";
                echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, twig_get_attribute($this->env, $this->source, $context["theme"], "attributes", [], "any", false, false, true, 51), "addClass", [0 => ($context["theme_classes"] ?? null)], "method", false, false, true, 51), 51, $this->source), "html", null, true);
                echo ">
        <div class=\"card h-100\">
          ";
                // line 53
                if (twig_get_attribute($this->env, $this->source, $context["theme"], "screenshot", [], "any", false, false, true, 53)) {
                    // line 54
                    echo "          <div class=\"card-img-top\">
            ";
                    // line 55
                    echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, $context["theme"], "screenshot", [], "any", false, false, true, 55), 55, $this->source), "html", null, true);
                    echo "
          </div>
          ";
                }
                // line 58
                echo "          <div class=\"card-body\">
            <h3 class=\"card-title\">";
                // line 60
                echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, $context["theme"], "name", [], "any", false, false, true, 60), 60, $this->source), "html", null, true);
                echo " ";
                echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, $context["theme"], "version", [], "any", false, false, true, 60), 60, $this->source), "html", null, true);
                // line 61
                if (twig_get_attribute($this->env, $this->source, $context["theme"], "notes", [], "any", false, false, true, 61)) {
                    // line 62
                    echo "                (";
                    echo $this->extensions['Drupal\Core\Template\TwigExtension']->renderVar($this->extensions['Drupal\Core\Template\TwigExtension']->safeJoin($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, $context["theme"], "notes", [], "any", false, false, true, 62), 62, $this->source), ", "));
                    echo ")";
                }
                // line 64
                echo "</h3>
            <div class=\"card-text\">";
                // line 65
                echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, $context["theme"], "description", [], "any", false, false, true, 65), 65, $this->source), "html", null, true);
                echo "</div>
            ";
                // line 66
                if (twig_get_attribute($this->env, $this->source, $context["theme"], "module_dependencies", [], "any", false, false, true, 66)) {
                    // line 67
                    echo "              <div class=\"theme-info__requires\">
                ";
                    // line 68
                    echo $this->extensions['Drupal\Core\Template\TwigExtension']->renderVar(t("Requires: @module_dependencies", ["@module_dependencies" => $this->extensions['Drupal\Core\Template\TwigExtension']->renderVar($this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, $context["theme"], "module_dependencies", [], "any", false, false, true, 68), 68, $this->source))]));
                    echo "
              </div>
            ";
                }
                // line 71
                echo "            ";
                // line 72
                echo "            ";
                if (twig_get_attribute($this->env, $this->source, $context["theme"], "incompatible", [], "any", false, false, true, 72)) {
                    // line 73
                    echo "              <div class=\"incompatible\">";
                    echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, $context["theme"], "incompatible", [], "any", false, false, true, 73), 73, $this->source), "html", null, true);
                    echo "</div>
            ";
                } else {
                    // line 75
                    echo "              ";
                    echo $this->extensions['Drupal\Core\Template\TwigExtension']->escapeFilter($this->env, $this->sandbox->ensureToStringAllowed(twig_get_attribute($this->env, $this->source, $context["theme"], "operations", [], "any", false, false, true, 75), 75, $this->source), "html", null, true);
                    echo "
            ";
                }
                // line 77
                echo "          </div>
        </div>
        </div>
      ";
            }
            $_parent = $context['_parent'];
            unset($context['_seq'], $context['_iterated'], $context['_key'], $context['theme'], $context['_parent'], $context['loop']);
            $context = array_intersect_key($context, $_parent) + $_parent;
            // line 81
            echo "    </div>
  ";
        }
        $_parent = $context['_parent'];
        unset($context['_seq'], $context['_iterated'], $context['_key'], $context['theme_group'], $context['_parent'], $context['loop']);
        $context = array_intersect_key($context, $_parent) + $_parent;
        // line 83
        echo "</div>
";
    }

    public function getTemplateName()
    {
        return "themes/contrib/bootstrap5/templates/admin/system-themes-page.html.twig";
    }

    public function isTraitable()
    {
        return false;
    }

    public function getDebugInfo()
    {
        return array (  155 => 83,  148 => 81,  139 => 77,  133 => 75,  127 => 73,  124 => 72,  122 => 71,  116 => 68,  113 => 67,  111 => 66,  107 => 65,  104 => 64,  99 => 62,  97 => 61,  93 => 60,  90 => 58,  84 => 55,  81 => 54,  79 => 53,  73 => 51,  71 => 48,  70 => 47,  69 => 46,  68 => 45,  66 => 44,  62 => 43,  58 => 42,  53 => 41,  51 => 37,  50 => 35,  48 => 34,  44 => 33,  39 => 32,);
    }

    public function getSourceContext()
    {
        return new Source("", "themes/contrib/bootstrap5/templates/admin/system-themes-page.html.twig", "/var/www/themes/contrib/bootstrap5/templates/admin/system-themes-page.html.twig");
    }
    
    public function checkSecurity()
    {
        static $tags = array("for" => 33, "set" => 35, "if" => 53);
        static $filters = array("escape" => 32, "safe_join" => 62, "t" => 68, "render" => 68);
        static $functions = array();

        try {
            $this->sandbox->checkSecurity(
                ['for', 'set', 'if'],
                ['escape', 'safe_join', 't', 'render'],
                []
            );
        } catch (SecurityError $e) {
            $e->setSourceContext($this->source);

            if ($e instanceof SecurityNotAllowedTagError && isset($tags[$e->getTagName()])) {
                $e->setTemplateLine($tags[$e->getTagName()]);
            } elseif ($e instanceof SecurityNotAllowedFilterError && isset($filters[$e->getFilterName()])) {
                $e->setTemplateLine($filters[$e->getFilterName()]);
            } elseif ($e instanceof SecurityNotAllowedFunctionError && isset($functions[$e->getFunctionName()])) {
                $e->setTemplateLine($functions[$e->getFunctionName()]);
            }

            throw $e;
        }

    }
}
